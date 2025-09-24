import { writeFileSync } from "node:fs"
import path from "node:path"

import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

import { documensoService } from "@/lib/documenso"
import { calComService } from "@/lib/calcom-service"
import type { Database } from "@/lib/supabase"
import {
  cancelStripeSubscriptions,
  cleanupCalComBookings,
  cleanupDocumenso,
  collectTenantData,
  createPrivacyRequestRecord,
  logPrivacyEvent,
  purgeTenantFromSupabase,
  redactTenantData,
  removeStripeCustomer,
  updatePrivacyRequest,
  type ServiceSupabaseClient,
  type TenantDataBundle,
} from "@/lib/privacy/workflows"

type CliAction = "export" | "erasure"

interface CliOptions {
  tenantId?: string
  email?: string
  action: CliAction
  outputPath?: string
  dryRun: boolean
  requesterEmail?: string
  processedBy?: string
}

interface ParsedArgs extends CliOptions {}

type StripeClient = Stripe | null

type NullableString = string | null | undefined

function parseArgs(argv: string[]): ParsedArgs {
  const options: ParsedArgs = {
    action: "export",
    dryRun: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith("--")) {
      continue
    }

    const key = arg.slice(2)
    switch (key) {
      case "tenant-id":
        options.tenantId = argv[index + 1]
        index += 1
        break
      case "email":
        options.email = argv[index + 1]
        index += 1
        break
      case "action":
        {
          const value = (argv[index + 1] || "export").toLowerCase()
          index += 1
          if (value === "erase" || value === "delete") {
            options.action = "erasure"
          } else if (value === "erasure" || value === "export") {
            options.action = value as CliAction
          } else {
            throw new Error(`Unknown action: ${value}. Expected export or erasure.`)
          }
        }
        break
      case "out":
      case "output":
        options.outputPath = argv[index + 1]
        index += 1
        break
      case "dry-run":
        options.dryRun = true
        break
      case "requester-email":
        options.requesterEmail = argv[index + 1]
        index += 1
        break
      case "processed-by":
        options.processedBy = argv[index + 1]
        index += 1
        break
      default:
        throw new Error(`Unsupported flag: ${arg}`)
    }
  }

  if (!options.tenantId && !options.email) {
    throw new Error("Provide either --tenant-id or --email")
  }

  return options
}

function ensureEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`)
  }
  return value
}

function resolveStripeClient(): StripeClient {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    return null
  }

  return new Stripe(stripeSecret, { apiVersion: "2024-06-20" })
}

function pickEnvelopeCleanupPayload(bundle: TenantDataBundle) {
  return bundle.documents
    .map((document) => ({
      envelopeId: document.documenso_envelope_id ?? "",
      recipientTokens: bundle.documentSignatures
        .filter((signature) => signature.document_id === document.id)
        .map((signature) => signature.documenso_signature_id || undefined)
        .filter((token): token is string => Boolean(token)),
    }))
    .filter((payload) => payload.envelopeId)
}

function extractCalComBookingIds(bundle: TenantDataBundle): string[] {
  const ids = new Set<string>()
  for (const booking of bundle.amenityBookings) {
    const metadata = booking.metadata
    if (metadata && typeof metadata === "object") {
      const possibleKeys = ["calcom_booking_id", "booking_id", "bookingId", "calcomId"] as const
      for (const key of possibleKeys) {
        const value = (metadata as Record<string, unknown>)[key]
        if (typeof value === "string" && value.length) {
          ids.add(value)
        }
      }
    }
  }
  return Array.from(ids)
}

function serialiseJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

async function resolveTenantId(
  client: ServiceSupabaseClient,
  tenantId: NullableString,
  email: NullableString,
): Promise<{ id: string; email: string | null }> {
  if (tenantId) {
    const { data, error } = await client
      .from("profiles")
      .select("id, email")
      .eq("id", tenantId)
      .maybeSingle()

    if (error) {
      throw new Error(`Unable to load tenant profile: ${error.message}`)
    }

    if (!data) {
      throw new Error(`Tenant with id ${tenantId} was not found`)
    }

    if (email && data.email && data.email !== email) {
      throw new Error(
        `Provided email ${email} does not match tenant record (${data.email})`,
      )
    }

    return { id: data.id, email: data.email }
  }

  if (!email) {
    throw new Error("Tenant email not provided")
  }

  const { data, error } = await client
    .from("profiles")
    .select("id, email")
    .eq("email", email)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to locate tenant by email: ${error.message}`)
  }

  if (!data) {
    throw new Error(`Tenant with email ${email} was not found`)
  }

  return { id: data.id, email: data.email }
}

function buildRequestMetadata(options: ParsedArgs): Record<string, unknown> {
  return {
    source: "scripts/privacy/dsar",
    invoked_at: new Date().toISOString(),
    dry_run: options.dryRun,
    action: options.action,
    output_path: options.outputPath ?? null,
    requester_email: options.requesterEmail ?? null,
    processed_by: options.processedBy ?? null,
  }
}

async function handleExport(
  supabase: ServiceSupabaseClient,
  requestId: string,
  bundle: TenantDataBundle,
  options: ParsedArgs,
) {
  const redacted = redactTenantData(bundle)
  const exportPayload = {
    generatedAt: new Date().toISOString(),
    tenantId: bundle.profile?.id,
    data: redacted,
  }

  const metadata = {
    ...buildRequestMetadata(options),
    export_summary: {
      record_counts: {
        rent_payments: redacted.rentPayments.length,
        subscriptions: redacted.subscriptions.length,
        documents: redacted.documents.length,
        document_signatures: redacted.documentSignatures.length,
        amenity_bookings: redacted.amenityBookings.length,
        maintenance_requests: redacted.maintenanceRequests.length,
        visitor_logs: redacted.visitorLogs.length,
      },
    },
  }

  if (options.outputPath) {
    const outputFile = path.resolve(options.outputPath)
    writeFileSync(outputFile, serialiseJson(exportPayload), "utf-8")
    await logPrivacyEvent({
      supabase,
      requestId,
      status: "export_saved",
      detail: `Export written to ${outputFile}`,
    })
    await updatePrivacyRequest({
      supabase,
      requestId,
      status: "completed",
      completedAt: new Date().toISOString(),
      exportLocation: outputFile,
      metadata,
    })
  } else {
    console.log(serialiseJson(exportPayload))
    await logPrivacyEvent({
      supabase,
      requestId,
      status: "export_generated",
      detail: "Export streamed to stdout",
    })
    await updatePrivacyRequest({
      supabase,
      requestId,
      status: "completed",
      completedAt: new Date().toISOString(),
      exportLocation: "stdout",
      metadata,
    })
  }
}

interface ErasureSummary {
  supabase: Awaited<ReturnType<typeof purgeTenantFromSupabase>> | null
  stripe: {
    customerRemoved: boolean
    subscriptionsCancelled: string[]
  }
  documenso: {
    envelopesProcessed: string[]
  }
  calCom: {
    bookingIds: string[]
  }
}

async function handleErasure(
  supabase: ServiceSupabaseClient,
  requestId: string,
  bundle: TenantDataBundle,
  options: ParsedArgs,
  stripe: StripeClient,
) {
  const summary: ErasureSummary = {
    supabase: null,
    stripe: {
      customerRemoved: false,
      subscriptionsCancelled: [],
    },
    documenso: {
      envelopesProcessed: [],
    },
    calCom: {
      bookingIds: [],
    },
  }

  if (options.dryRun) {
    await logPrivacyEvent({
      supabase,
      requestId,
      status: "dry_run",
      detail: "Dry-run enabled. No destructive actions executed.",
    })
  } else {
    await logPrivacyEvent({
      supabase,
      requestId,
      status: "supabase_cleanup_started",
      detail: `Purging tenant ${bundle.profile?.id ?? "unknown"} from Supabase`,
    })
    summary.supabase = await purgeTenantFromSupabase(supabase, bundle.profile!.id, bundle)
    await logPrivacyEvent({
      supabase,
      requestId,
      status: "supabase_cleanup_completed",
      detail: serialiseJson(summary.supabase),
    })
  }

  const stripeCustomerId = bundle.profile?.stripe_customer_id ?? null
  const stripeSubscriptionIds = bundle.subscriptions
    .map((subscription) => subscription.stripe_subscription_id)
    .filter((id): id is string => Boolean(id))

  if (!options.dryRun && stripe && (stripeCustomerId || stripeSubscriptionIds.length)) {
    if (stripeSubscriptionIds.length) {
      await cancelStripeSubscriptions(stripe, stripeSubscriptionIds)
      summary.stripe.subscriptionsCancelled = stripeSubscriptionIds
      await logPrivacyEvent({
        supabase,
        requestId,
        status: "stripe_subscriptions_cancelled",
        detail: `Cancelled ${stripeSubscriptionIds.length} subscription(s)`
      })
    }

    if (stripeCustomerId) {
      await removeStripeCustomer(stripe, stripeCustomerId)
      summary.stripe.customerRemoved = true
      await logPrivacyEvent({
        supabase,
        requestId,
        status: "stripe_customer_removed",
        detail: `Removed Stripe customer ${stripeCustomerId}`,
      })
    }
  } else if (!options.dryRun && (stripeCustomerId || stripeSubscriptionIds.length) && !stripe) {
    await logPrivacyEvent({
      supabase,
      requestId,
      status: "stripe_skipped",
      detail: "Stripe client not configured. Set STRIPE_SECRET_KEY to enable deletions.",
    })
  }

  const documensoPayloads = pickEnvelopeCleanupPayload(bundle)
  if (documensoPayloads.length) {
    summary.documenso.envelopesProcessed = documensoPayloads.map((payload) => payload.envelopeId)
    if (!options.dryRun) {
      if (process.env.DOCUMENSO_API_KEY) {
        await cleanupDocumenso(documensoService, documensoPayloads)
        await logPrivacyEvent({
          supabase,
          requestId,
          status: "documenso_redacted",
          detail: `Redacted ${documensoPayloads.length} envelope(s)`
        })
      } else {
        await logPrivacyEvent({
          supabase,
          requestId,
          status: "documenso_skipped",
          detail: "Documenso API key not configured. Envelopes require manual review.",
        })
      }
    } else {
      await logPrivacyEvent({
        supabase,
        requestId,
        status: "documenso_pending",
        detail: `Dry-run: would redact ${documensoPayloads.length} envelope(s)`
      })
    }
  }

  const calBookingIds = extractCalComBookingIds(bundle)
  summary.calCom.bookingIds = calBookingIds
  if (calBookingIds.length) {
    if (!options.dryRun) {
      if (process.env.CALCOM_API_KEY) {
        await cleanupCalComBookings(calComService, calBookingIds)
        await logPrivacyEvent({
          supabase,
          requestId,
          status: "calcom_bookings_removed",
          detail: `Removed ${calBookingIds.length} Cal.com booking(s)`
        })
      } else {
        await logPrivacyEvent({
          supabase,
          requestId,
          status: "calcom_skipped",
          detail: "Cal.com API key not configured. Bookings left untouched.",
        })
      }
    } else {
      await logPrivacyEvent({
        supabase,
        requestId,
        status: "calcom_pending",
        detail: `Dry-run: would remove ${calBookingIds.length} Cal.com booking(s)`
      })
    }
  }

  const metadata = {
    ...buildRequestMetadata(options),
    erasure_summary: summary,
  }

  await updatePrivacyRequest({
    supabase,
    requestId,
    status: options.dryRun ? "in_progress" : "completed",
    completedAt: options.dryRun ? undefined : new Date().toISOString(),
    metadata,
  })

  if (!options.dryRun) {
    await logPrivacyEvent({
      supabase,
      requestId,
      status: "erasure_completed",
      detail: serialiseJson(summary),
    })
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const supabaseUrl = ensureEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey = ensureEnv("SUPABASE_SERVICE_ROLE_KEY")

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const tenant = await resolveTenantId(supabase, args.tenantId, args.email)

  const request = await createPrivacyRequestRecord({
    supabase,
    tenantId: tenant.id,
    requesterEmail: args.requesterEmail ?? tenant.email ?? null,
    requestType: args.action,
    metadata: buildRequestMetadata(args),
  })

  await logPrivacyEvent({
    supabase,
    requestId: request.id,
    status: "received",
    detail: `Request registered for tenant ${tenant.id}`,
  })

  await updatePrivacyRequest({
    supabase,
    requestId: request.id,
    status: "in_progress",
    metadata: buildRequestMetadata(args),
  })

  const bundle = await collectTenantData(supabase, tenant.id)

  if (!bundle.profile) {
    throw new Error(`Tenant ${tenant.id} is missing a profile record`)
  }

  const stripeClient = resolveStripeClient()

  try {
    if (args.action === "export") {
      await handleExport(supabase, request.id, bundle, args)
    } else {
      await handleErasure(supabase, request.id, bundle, args, stripeClient)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    await logPrivacyEvent({
      supabase,
      requestId: request.id,
      status: "failed",
      detail: message,
    })
    await updatePrivacyRequest({
      supabase,
      requestId: request.id,
      status: "failed",
      failureReason: message,
      metadata: buildRequestMetadata(args),
    })
    console.error(message)
    process.exitCode = 1
    return
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exitCode = 1
})
