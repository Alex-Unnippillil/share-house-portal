import { headers } from "next/headers"
import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import {
  createClient,
  type PostgrestError
} from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

type AuditEventStatus = "processed" | "skipped" | "failed"

type SafeWriteResult = {
  data: any[]
  removedColumns: string[]
  skipped: boolean
}

export const runtime = "nodejs"

export async function POST(req: Request) {
  const stripeSignature = (await headers()).get("stripe-signature")

  if (!stripeSignature) {
    await recordAuditLog({
      type: "stripe.webhook.missing_signature",
      status: "failed",
      message: "Missing stripe-signature header"
    })
    return new Response("Missing stripe-signature header", { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    await recordAuditLog({
      type: "stripe.webhook.misconfiguration",
      status: "failed",
      message: "STRIPE_WEBHOOK_SECRET is not configured"
    })
    return new Response("Webhook not configured", { status: 500 })
  }

  const stripe = getStripe()
  const rawBody = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, stripeSignature, webhookSecret)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to verify Stripe webhook signature"

    await recordAuditLog({
      type: "stripe.webhook.signature_verification_failed",
      status: "failed",
      message,
      metadata: {
        signaturePresent: Boolean(stripeSignature)
      },
      payload: safeJsonParse(rawBody)
    })

    return new Response("Invalid webhook signature", { status: 400 })
  }

  if (event.type !== "payment_intent.succeeded") {
    await recordAuditLog({
      type: event.type,
      status: "skipped",
      referenceId: event.id,
      message: "Event type not handled",
      payload: sanitizeStripeEvent(event)
    })

    return new Response(null, { status: 200 })
  }

  try {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const result = await handlePaymentIntentSucceeded(paymentIntent)

    await recordAuditLog({
      type: event.type,
      status: "processed",
      referenceId: event.id,
      payload: sanitizeStripeEvent(event),
      metadata: result
    })

    return new Response(null, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"

    console.error("Stripe webhook handler failed", error)

    await recordAuditLog({
      type: event.type,
      status: "failed",
      referenceId: event.id,
      message,
      payload: sanitizeStripeEvent(event)
    })

    return new Response("Webhook handler failed", { status: 500 })
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const sanitizedMetadata = sanitizeMetadata(paymentIntent.metadata)
  const invoiceCandidates = collectInvoiceCandidates(paymentIntent, sanitizedMetadata)
  const supplyShareIds = parseSupplyShareIds(paymentIntent, sanitizedMetadata)
  const processedAt = toIsoTimestamp(paymentIntent.created)
  const nowIso = new Date().toISOString()
  const amountReceivedCents = paymentIntent.amount_received ?? paymentIntent.amount ?? 0
  const amountReceived = amountReceivedCents / 100
  const currency = paymentIntent.currency
    ? paymentIntent.currency.toUpperCase()
    : undefined

  const invoiceUpdates: Array<{
    column: string
    value: string
    updatedRowIds: string[]
    removedColumns: string[]
    skipped: boolean
  }> = []

  let matchedInvoiceId: string | null = null

  for (const candidate of invoiceCandidates) {
    const updateResult = await safeUpdateEq(
      "invoices",
      candidate.column,
      candidate.value,
      stripUndefined({
        status: "paid",
        paid_at: processedAt,
        stripe_payment_intent_id: paymentIntent.id,
        amount_paid: amountReceived,
        currency,
        updated_at: nowIso
      })
    )

    invoiceUpdates.push({
      column: candidate.column,
      value: candidate.value,
      updatedRowIds: (updateResult.data ?? [])
        .map((row) => (row && typeof row === "object" ? (row as { id?: string }).id ?? null : null))
        .filter((id): id is string => Boolean(id)),
      removedColumns: updateResult.removedColumns,
      skipped: updateResult.skipped
    })

    if (!matchedInvoiceId && updateResult.data.length > 0) {
      const firstRow = updateResult.data[0]
      if (firstRow && typeof firstRow === "object" && "id" in firstRow) {
        matchedInvoiceId = String((firstRow as { id: unknown }).id)
        break
      }
    }
  }

  const paymentRecord = await safeUpsert(
    "payments",
    stripUndefined({
      invoice_id: matchedInvoiceId ?? invoiceCandidates.find((candidate) => candidate.column === "id")?.value,
      stripe_payment_intent_id: paymentIntent.id,
      amount: amountReceived,
      currency,
      status: paymentIntent.status ?? "succeeded",
      processed_at: processedAt,
      metadata: sanitizedMetadata ?? undefined
    }),
    "stripe_payment_intent_id"
  )

  let supplyShareUpdate: SafeWriteResult | undefined

  if (supplyShareIds.length > 0) {
    supplyShareUpdate = await safeUpdateIn(
      "supply_shares",
      "id",
      supplyShareIds,
      stripUndefined({
        status: "settled",
        settled_at: processedAt,
        settled_payment_intent_id: paymentIntent.id,
        updated_at: nowIso
      })
    )
  }

  return stripUndefined({
    invoiceUpdates,
    matchedInvoiceId,
    invoiceCandidates,
    paymentRecord: {
      removedColumns: paymentRecord.removedColumns,
      skipped: paymentRecord.skipped,
      paymentRowIds: (paymentRecord.data ?? [])
        .map((row) => (row && typeof row === "object" ? (row as { id?: string }).id ?? null : null))
        .filter((id): id is string => Boolean(id))
    },
    supplyShareUpdate: supplyShareUpdate
      ? {
          requestedIds: supplyShareIds,
          removedColumns: supplyShareUpdate.removedColumns,
          skipped: supplyShareUpdate.skipped,
          updatedRowIds: (supplyShareUpdate.data ?? [])
            .map((row) => (row && typeof row === "object" ? (row as { id?: string }).id ?? null : null))
            .filter((id): id is string => Boolean(id))
        }
      : undefined,
    amountReceived,
    currency,
    metadata: sanitizedMetadata ?? undefined
  })
}

async function safeUpdateEq(
  table: string,
  column: string,
  value: string,
  updates: Record<string, unknown>
): Promise<SafeWriteResult> {
  const cleanedUpdates = { ...updates }
  const removedColumns: string[] = []

  if (Object.keys(cleanedUpdates).length === 0) {
    return { data: [], removedColumns, skipped: true }
  }

  let selectColumns: string | undefined = "id"

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase.from(table).update(cleanedUpdates).eq(column, value)

    if (selectColumns) {
      query = query.select(selectColumns)
    }

    const { data, error } = await query

    if (!error) {
      return { data: data ?? [], removedColumns, skipped: false }
    }

    if (isUndefinedColumnError(error)) {
      const missingColumn = extractMissingColumnName(error)

      if (missingColumn && missingColumn === selectColumns) {
        selectColumns = "*"
        continue
      }

      if (missingColumn && missingColumn in cleanedUpdates) {
        delete cleanedUpdates[missingColumn]
        removedColumns.push(missingColumn)

        if (Object.keys(cleanedUpdates).length === 0) {
          return { data: [], removedColumns, skipped: true }
        }

        continue
      }
    }

    throw error
  }
}

async function safeUpdateIn(
  table: string,
  column: string,
  values: string[],
  updates: Record<string, unknown>
): Promise<SafeWriteResult> {
  const cleanedUpdates = { ...updates }
  const removedColumns: string[] = []

  if (values.length === 0 || Object.keys(cleanedUpdates).length === 0) {
    return { data: [], removedColumns, skipped: true }
  }

  let selectColumns: string | undefined = "id"

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase.from(table).update(cleanedUpdates).in(column, values)

    if (selectColumns) {
      query = query.select(selectColumns)
    }

    const { data, error } = await query

    if (!error) {
      return { data: data ?? [], removedColumns, skipped: false }
    }

    if (isUndefinedColumnError(error)) {
      const missingColumn = extractMissingColumnName(error)

      if (missingColumn && missingColumn === selectColumns) {
        selectColumns = "*"
        continue
      }

      if (missingColumn && missingColumn in cleanedUpdates) {
        delete cleanedUpdates[missingColumn]
        removedColumns.push(missingColumn)

        if (Object.keys(cleanedUpdates).length === 0) {
          return { data: [], removedColumns, skipped: true }
        }

        continue
      }
    }

    throw error
  }
}

async function safeUpsert(
  table: string,
  record: Record<string, unknown>,
  conflictTarget?: string
): Promise<SafeWriteResult> {
  const payload = { ...record }
  const removedColumns: string[] = []

  if (Object.keys(payload).length === 0) {
    return { data: [], removedColumns, skipped: true }
  }

  let selectColumns: string | undefined = "id"

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase.from(table).upsert(payload, conflictTarget ? { onConflict: conflictTarget } : undefined)

    if (selectColumns) {
      query = query.select(selectColumns)
    }

    const { data, error } = await query

    if (!error) {
      return { data: data ?? [], removedColumns, skipped: false }
    }

    if (isUndefinedColumnError(error)) {
      const missingColumn = extractMissingColumnName(error)

      if (missingColumn && missingColumn === selectColumns) {
        selectColumns = "*"
        continue
      }

      if (missingColumn && missingColumn in payload) {
        delete payload[missingColumn]
        removedColumns.push(missingColumn)

        if (Object.keys(payload).length === 0) {
          return { data: [], removedColumns, skipped: true }
        }

        continue
      }
    }

    throw error
  }
}

function parseSupplyShareIds(
  paymentIntent: Stripe.PaymentIntent,
  metadata: Record<string, string> | null
): string[] {
  const keys = [
    "rolled_supply_share_ids",
    "supply_share_ids",
    "supply_share_id",
    "rolledSupplyShareIds",
    "supplyShareIds"
  ]

  const identifiers = new Set<string>()

  for (const key of keys) {
    const rawValue = metadata?.[key]
    for (const id of parseIdentifierList(rawValue)) {
      identifiers.add(id)
    }
  }

  if (typeof paymentIntent.metadata?.rolled_supply_share_ids === "string") {
    for (const id of parseIdentifierList(paymentIntent.metadata.rolled_supply_share_ids)) {
      identifiers.add(id)
    }
  }

  return Array.from(identifiers)
}

function parseIdentifierList(value?: string | null): string[] {
  if (!value) {
    return []
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return []
  }

  try {
    const parsed = JSON.parse(trimmed)

    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => String(entry).trim())
        .filter((entry) => entry.length > 0)
    }
  } catch (error) {
    // The value was not JSON encoded. Fallback to comma-separated parsing.
    if (error instanceof Error) {
      // noop: handled by fallback below
    }
  }

  return trimmed
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function collectInvoiceCandidates(
  paymentIntent: Stripe.PaymentIntent,
  metadata: Record<string, string> | null
): Array<{ column: string; value: string }> {
  const candidates: Array<{ column: string; value: string }> = []
  const seen = new Set<string>()

  const pushCandidate = (column: string, value?: string | null) => {
    if (!value) {
      return
    }

    const normalized = value.trim()

    if (!normalized) {
      return
    }

    const key = `${column}:${normalized}`

    if (!seen.has(key)) {
      seen.add(key)
      candidates.push({ column, value: normalized })
    }
  }

  pushCandidate("id", metadata?.invoice_id)
  pushCandidate("id", metadata?.invoiceId)
  pushCandidate("id", metadata?.invoice_uuid)
  pushCandidate("id", metadata?.invoiceUuid)
  pushCandidate("stripe_invoice_id", metadata?.stripe_invoice_id)

  if (typeof paymentIntent.invoice === "string") {
    pushCandidate("stripe_invoice_id", paymentIntent.invoice)
  } else if (paymentIntent.invoice && typeof paymentIntent.invoice === "object") {
    const invoiceObject = paymentIntent.invoice as { id?: string | null }
    pushCandidate("stripe_invoice_id", invoiceObject.id ?? undefined)
  }

  return candidates
}

async function recordAuditLog(entry: {
  type: string
  status: AuditEventStatus
  referenceId?: string | null
  message?: string
  metadata?: Record<string, unknown>
  payload?: unknown
}) {
  const record = stripUndefined({
    event_type: entry.type,
    status: entry.status,
    reference_id: entry.referenceId ?? undefined,
    message: entry.message ?? undefined,
    source: "stripe",
    payload: entry.payload ?? undefined,
    metadata: entry.metadata ?? undefined
  })

  const { error } = await supabase.from("events").insert(record)

  if (error) {
    console.error("Failed to record audit event", error)
  }
}

function sanitizeStripeEvent(event: Stripe.Event): Record<string, unknown> {
  return JSON.parse(JSON.stringify(event)) as Record<string, unknown>
}

function sanitizeMetadata(metadata: Stripe.Metadata | null | undefined):
  | Record<string, string>
  | null {
  if (!metadata) {
    return null
  }

  const entries = Object.entries(metadata).filter(([, value]) => typeof value === "string")

  if (entries.length === 0) {
    return null
  }

  return Object.fromEntries(entries.map(([key, value]) => [key, String(value)]))
}

function toIsoTimestamp(epochSeconds?: number | null): string {
  const milliseconds = typeof epochSeconds === "number" ? epochSeconds * 1000 : Date.now()
  return new Date(milliseconds).toISOString()
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T
}

function isUndefinedColumnError(error: unknown): error is PostgrestError {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error as PostgrestError).code === "42703"
  )
}

function extractMissingColumnName(error: PostgrestError): string | null {
  if (!error.message) {
    return null
  }

  const match = error.message.match(/column \"([^\"]+)\"/)
  return match?.[1] ?? null
}
