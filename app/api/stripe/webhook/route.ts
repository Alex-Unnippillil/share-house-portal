import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

export const runtime = "nodejs"

type DatabaseClient = SupabaseClient<Database>

type InvoiceIdentifiers = {
  invoiceId?: string
  stripeInvoiceId?: string
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing Stripe signature or webhook secret" },
      { status: 400 }
    )
  }

  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = Stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown signature error"
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    )
  }

  let supabase: DatabaseClient
  try {
    supabase = createServiceRoleClient()
  } catch (error) {
    console.error("Failed to configure Supabase client", error)
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  await logEvent(supabase, event)

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await updatePaymentStatus(supabase, paymentIntent.id, "succeeded")
        await updateInvoiceStatus(
          supabase,
          "paid",
          extractInvoiceIdentifiersFromPaymentIntent(paymentIntent)
        )
        break
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await updatePaymentStatus(supabase, paymentIntent.id, "failed")
        await updateInvoiceStatus(
          supabase,
          "payment_failed",
          extractInvoiceIdentifiersFromPaymentIntent(paymentIntent)
        )
        break
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id
        await updatePaymentStatus(supabase, paymentIntentId, "refunded")
        await updateInvoiceStatus(
          supabase,
          "refunded",
          extractInvoiceIdentifiersFromCharge(charge)
        )
        break
      }
      default: {
        break
      }
    }
  } catch (error) {
    console.error(`Error handling Stripe webhook ${event.id}`, error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function createServiceRoleClient(): DatabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration")
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function logEvent(client: DatabaseClient, event: Stripe.Event) {
  const { error } = await client
    .from("events")
    .insert([{ type: event.type, payload: event }])

  if (error) {
    console.error("Failed to record Stripe webhook event", error)
  }
}

async function updatePaymentStatus(
  client: DatabaseClient,
  paymentIntentId: string | null | undefined,
  status: string
) {
  if (!paymentIntentId) {
    return
  }

  const { error } = await client
    .from("payments")
    .update({ status })
    .eq("stripe_payment_intent_id", paymentIntentId)

  if (error) {
    throw new Error(`Failed to update payment ${paymentIntentId}: ${error.message}`)
  }
}

async function updateInvoiceStatus(
  client: DatabaseClient,
  status: string,
  identifiers: InvoiceIdentifiers
) {
  const { invoiceId, stripeInvoiceId } = identifiers

  if (invoiceId) {
    const { error } = await client.from("invoices").update({ status }).eq("id", invoiceId)
    if (error) {
      throw new Error(`Failed to update invoice ${invoiceId}: ${error.message}`)
    }
    return
  }

  if (stripeInvoiceId) {
    const { error } = await client
      .from("invoices")
      .update({ status })
      .eq("stripe_invoice_id", stripeInvoiceId)

    if (error) {
      throw new Error(`Failed to update invoice ${stripeInvoiceId}: ${error.message}`)
    }
  }
}

function extractInvoiceIdentifiersFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent
): InvoiceIdentifiers {
  return {
    invoiceId: getMetadataValue(paymentIntent.metadata, "invoice_id"),
    stripeInvoiceId:
      typeof paymentIntent.invoice === "string"
        ? paymentIntent.invoice
        : paymentIntent.invoice?.id,
  }
}

function extractInvoiceIdentifiersFromCharge(charge: Stripe.Charge): InvoiceIdentifiers {
  return {
    invoiceId: getMetadataValue(charge.metadata, "invoice_id"),
    stripeInvoiceId:
      typeof charge.invoice === "string" ? charge.invoice : charge.invoice?.id ?? undefined,
  }
}

function getMetadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string
): string | undefined {
  if (!metadata) {
    return undefined
  }

  const value = metadata[key]
  return typeof value === "string" && value.length > 0 ? value : undefined
}
