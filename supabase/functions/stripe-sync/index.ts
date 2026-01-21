import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import Stripe from "npm:stripe@12.17.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5"

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")
const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required environment configuration for Stripe sync")
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BATCH_SIZE = 50
const DEFAULT_LOOKBACK_SECONDS = 60 * 60 * 24 * 90 // 90 days
const REFRESH_BUFFER_SECONDS = 60 * 60 * 24 // 24 hours

type SyncTotals = {
  invoiceCount: number
  lineItemCount: number
  paymentIntentCount: number
}

type SyncRequestBody = {
  since?: string
}

function unixSecondsFromIso(iso: string | null): number | null {
  if (!iso) {
    return null
  }
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000)
}

function toIso(seconds: number | null | undefined): string | null {
  if (!seconds) {
    return null
  }
  return new Date(seconds * 1000).toISOString()
}

function coerceCurrency(value: string | null | undefined): string {
  return (value ?? "usd").toLowerCase()
}

type StripeResourceLike = { id?: string | null } | string | null | undefined

function asString(value: StripeResourceLike): string | null {
  if (!value) {
    return null
  }
  if (typeof value === "string") {
    return value
  }
  const candidate = value as { id?: string | null }
  return typeof candidate.id === "string" ? candidate.id : null
}

async function resolveSinceTimestamp(
  table: "stripe_invoices" | "stripe_payment_intents",
  column: "stripe_created_at",
  requestedSince?: string,
): Promise<number> {
  if (requestedSince) {
    const sinceValue = unixSecondsFromIso(requestedSince)
    if (sinceValue) {
      return sinceValue
    }
  }

  const { data, error } = await supabase
    .from(table)
    .select(`${column}`)
    .order(column, { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error(`Failed to fetch latest ${table} timestamp`, error)
  }

  const latestIso = data?.[column] as string | null | undefined
  const fallback = Math.floor(Date.now() / 1000) - DEFAULT_LOOKBACK_SECONDS
  const resolved = unixSecondsFromIso(latestIso ?? null)
  if (!resolved) {
    return fallback
  }

  return Math.max(resolved - REFRESH_BUFFER_SECONDS, fallback)
}

async function upsertRecords<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
): Promise<void> {
  if (!rows.length) {
    return
  }

  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" })
  if (error) {
    throw new Error(`Failed to upsert into ${table}: ${error.message}`)
  }
}

function mapInvoice(invoice: Stripe.Invoice) {
  const updatedCandidates = [
    invoice.status_transitions?.paid_at,
    invoice.status_transitions?.marked_uncollectible_at,
    invoice.status_transitions?.voided_at,
    invoice.status_transitions?.finalized_at,
  ]
  const updatedAtSeconds = updatedCandidates.find((value) => !!value) ?? invoice.created ?? null

  return {
    id: invoice.id,
    customer_id: asString(invoice.customer),
    customer_email: invoice.customer_email ?? null,
    subscription_id: asString(invoice.subscription as Stripe.Subscription | string | null | undefined),
    status: invoice.status ?? null,
    collection_method: invoice.collection_method ?? null,
    currency: coerceCurrency(invoice.currency),
    total: invoice.total ?? null,
    amount_due: invoice.amount_due ?? null,
    amount_paid: invoice.amount_paid ?? null,
    amount_remaining: invoice.amount_remaining ?? null,
    hosted_invoice_url: invoice.hosted_invoice_url ?? null,
    due_date: toIso(invoice.due_date ?? null),
    period_start: toIso(invoice.period_start ?? null),
    period_end: toIso(invoice.period_end ?? null),
    livemode: invoice.livemode ?? false,
    metadata: invoice.metadata ?? {},
    stripe_created_at: toIso(invoice.created ?? null),
    stripe_updated_at: toIso(updatedAtSeconds ?? null),
  }
}

function mapLineItem(invoiceId: string, line: Stripe.InvoiceLineItem) {
  const price = typeof line.price === "object" && line.price ? line.price : null
  return {
    id: line.id,
    invoice_id: invoiceId,
    price_id: price?.id ?? (typeof line.price === "string" ? line.price : null),
    product_id: price && typeof price.product === "object" && price.product
      ? (price.product as Stripe.Product).id
      : typeof price?.product === "string"
        ? price.product
        : null,
    description: line.description ?? null,
    amount: line.amount ?? 0,
    currency: coerceCurrency(line.currency ?? price?.currency ?? "usd"),
    period_start: toIso(line.period?.start ?? null),
    period_end: toIso(line.period?.end ?? null),
    proration: line.proration ?? false,
    quantity: line.quantity ?? null,
    livemode: line.livemode ?? false,
    metadata: line.metadata ?? {},
  }
}

function mapPaymentIntent(intent: Stripe.PaymentIntent) {
  return {
    id: intent.id,
    customer_id: asString(intent.customer),
    invoice_id: asString(intent.invoice),
    status: intent.status ?? null,
    amount: intent.amount ?? 0,
    currency: coerceCurrency(intent.currency ?? "usd"),
    payment_method: asString(intent.payment_method),
    description: intent.description ?? null,
    receipt_email: intent.receipt_email ?? null,
    latest_charge: asString(intent.latest_charge),
    livemode: intent.livemode ?? false,
    metadata: intent.metadata ?? {},
    stripe_created_at: toIso(intent.created ?? null),
    stripe_updated_at: intent.created ? toIso(intent.created) : null,
    succeeded_at: intent.status_transitions?.succeeded_at
      ? toIso(intent.status_transitions.succeeded_at)
      : null,
    canceled_at: intent.status_transitions?.canceled_at
      ? toIso(intent.status_transitions.canceled_at)
      : null,
  }
}

async function fetchAllInvoiceLineItems(invoice: Stripe.Invoice): Promise<Stripe.InvoiceLineItem[]> {
  if (invoice.lines?.has_more) {
    const items: Stripe.InvoiceLineItem[] = []
    for await (const item of stripe.invoices.listLineItems(invoice.id, { limit: 100 })) {
      items.push(item)
    }
    return items
  }

  return Array.isArray(invoice.lines?.data) ? invoice.lines.data : []
}

async function syncInvoices(since: number): Promise<{ invoiceCount: number; lineItemCount: number }> {
  const invoiceParams: Stripe.InvoiceListParams = {
    limit: 100,
    created: { gte: since },
    expand: ["data.lines.data.price", "data.lines.data.price.product"],
  }

  let invoiceCount = 0
  let lineItemCount = 0
  let invoiceBuffer: ReturnType<typeof mapInvoice>[] = []
  let lineBuffer: ReturnType<typeof mapLineItem>[] = []

  for await (const invoice of stripe.invoices.list(invoiceParams)) {
    invoiceCount += 1
    invoiceBuffer.push(mapInvoice(invoice))

    const lines = await fetchAllInvoiceLineItems(invoice)
    for (const line of lines) {
      lineItemCount += 1
      lineBuffer.push(mapLineItem(invoice.id, line))
      if (lineBuffer.length >= BATCH_SIZE) {
        await upsertRecords("stripe_invoice_line_items", lineBuffer)
        lineBuffer = []
      }
    }

    if (invoiceBuffer.length >= BATCH_SIZE) {
      await upsertRecords("stripe_invoices", invoiceBuffer)
      invoiceBuffer = []
    }
  }

  if (invoiceBuffer.length) {
    await upsertRecords("stripe_invoices", invoiceBuffer)
  }
  if (lineBuffer.length) {
    await upsertRecords("stripe_invoice_line_items", lineBuffer)
  }

  return { invoiceCount, lineItemCount }
}

async function syncPaymentIntents(since: number): Promise<number> {
  const intentParams: Stripe.PaymentIntentListParams = {
    limit: 100,
    created: { gte: since },
  }

  let count = 0
  let buffer: ReturnType<typeof mapPaymentIntent>[] = []

  for await (const intent of stripe.paymentIntents.list(intentParams)) {
    count += 1
    buffer.push(mapPaymentIntent(intent))
    if (buffer.length >= BATCH_SIZE) {
      await upsertRecords("stripe_payment_intents", buffer)
      buffer = []
    }
  }

  if (buffer.length) {
    await upsertRecords("stripe_payment_intents", buffer)
  }

  return count
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  const nowIso = new Date().toISOString()
  const { data: runRecord, error: runError } = await supabase
    .from("stripe_sync_runs")
    .insert({ status: "pending", run_started_at: nowIso })
    .select()
    .maybeSingle()

  if (runError) {
    console.error("Failed to create sync run", runError)
  }

  const runId = runRecord?.id ?? null
  let totals: SyncTotals = { invoiceCount: 0, lineItemCount: 0, paymentIntentCount: 0 }

  try {
    const body: SyncRequestBody = await req.json().catch(() => ({}))
    const invoiceSince = await resolveSinceTimestamp("stripe_invoices", "stripe_created_at", body.since)
    const paymentsSince = await resolveSinceTimestamp("stripe_payment_intents", "stripe_created_at", body.since)

    const invoiceTotals = await syncInvoices(invoiceSince)
    const paymentIntentCount = await syncPaymentIntents(paymentsSince)

    totals = { ...invoiceTotals, paymentIntentCount }

    if (runId) {
      await supabase
        .from("stripe_sync_runs")
        .update({
          status: "succeeded",
          run_completed_at: new Date().toISOString(),
          invoice_count: invoiceTotals.invoiceCount,
          line_item_count: invoiceTotals.lineItemCount,
          payment_intent_count: paymentIntentCount,
        })
        .eq("id", runId)
    }

    return new Response(JSON.stringify({ ok: true, totals }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Stripe sync failed", error)
    if (runId) {
      await supabase
        .from("stripe_sync_runs")
        .update({
          status: "failed",
          run_completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : String(error),
        })
        .eq("id", runId)
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
})
