import { cookies } from "next/headers"
import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import type Stripe from "stripe"

import { getStripe } from "@/lib/stripe"
import type { Database } from "@/lib/supabase"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const serviceRoleClient =
  supabaseUrl && serviceRoleKey
    ? createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null

const CLOSED_INVOICE_STATUSES = new Set([
  "paid",
  "closed",
  "void",
  "forgiven",
  "canceled",
])

type InvoiceRecord = {
  id: string
  tenant_id: string | null
  unit_id?: string | null
  amount_due: number | string | null
  currency: string | null
  status?: string | null
  stripe_payment_intent_id?: string | null
  stripe_customer_id?: string | null
  stripe_invoice_id?: string | null
  description?: string | null
}

function parseAmount(amount: InvoiceRecord["amount_due"]): number | null {
  if (typeof amount === "number") {
    return Number.isFinite(amount) ? amount : null
  }
  if (typeof amount === "string" && amount.trim().length > 0) {
    const value = Number(amount)
    return Number.isFinite(value) ? value : null
  }
  return null
}

function resolveCurrency(currency: string | null | undefined): string {
  return currency?.toUpperCase() ?? "USD"
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { invoiceId: string } },
) {
  if (!serviceRoleClient) {
    return Response.json(
      { error: "Supabase service role key is not configured." },
      { status: 500 },
    )
  }

  try {
    const invoiceId = params?.invoiceId
    if (!invoiceId || typeof invoiceId !== "string" || invoiceId.trim().length === 0) {
      return Response.json({ error: "Invoice id is required." }, { status: 400 })
    }

    let stripe: Stripe
    try {
      stripe = getStripe()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stripe is not configured."
      return Response.json({ error: message }, { status: 500 })
    }

    const supabase = createRouteHandlerClient<Database>({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("Failed to verify user session", authError)
      return Response.json({ error: "Unable to verify session." }, { status: 401 })
    }

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error: invoiceError } = await serviceRoleClient
      .from("rent_invoices")
      .select(
        [
          "id",
          "tenant_id",
          "unit_id",
          "amount_due",
          "currency",
          "status",
          "stripe_payment_intent_id",
          "stripe_customer_id",
          "stripe_invoice_id",
          "description",
        ].join(","),
      )
      .eq("id", invoiceId)
      .maybeSingle()

    if (invoiceError) {
      console.error("Unable to load invoice", invoiceError)
      return Response.json({ error: "Invoice could not be retrieved." }, { status: 500 })
    }

    const invoice = data ?? null

    if (!invoice || !invoice.tenant_id || invoice.tenant_id !== user.id) {
      return Response.json({ error: "Invoice not found." }, { status: 404 })
    }

    const invoiceAmount = parseAmount(invoice.amount_due)
    if (!invoiceAmount || invoiceAmount <= 0) {
      return Response.json({ error: "Invoice does not have a payable balance." }, { status: 400 })
    }

    const invoiceCurrency = resolveCurrency(invoice.currency)

    if (invoice.status && CLOSED_INVOICE_STATUSES.has(invoice.status.toLowerCase())) {
      return Response.json({ error: "Invoice is not payable." }, { status: 400 })
    }

    const amountInSmallestUnit = Math.round(invoiceAmount * 100)

    let paymentIntent: Stripe.PaymentIntent | null = null

    if (invoice.stripe_payment_intent_id) {
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(
          invoice.stripe_payment_intent_id,
        )

        if (paymentIntent.status === "succeeded") {
          return Response.json({ error: "Invoice has already been paid." }, { status: 400 })
        }

        const needsUpdate =
          paymentIntent.amount !== amountInSmallestUnit ||
          paymentIntent.currency.toUpperCase() !== invoiceCurrency ||
          (invoice.stripe_customer_id &&
            typeof paymentIntent.customer === "string" &&
            paymentIntent.customer !== invoice.stripe_customer_id)

        if (needsUpdate) {
          paymentIntent = await stripe.paymentIntents.update(paymentIntent.id, {
            amount: amountInSmallestUnit,
            currency: invoiceCurrency.toLowerCase(),
            customer: invoice.stripe_customer_id ?? undefined,
            metadata: {
              invoice_id: invoice.id,
              tenant_id: invoice.tenant_id,
              ...(invoice.unit_id ? { unit_id: invoice.unit_id } : {}),
            },
          })
        }
      } catch (error) {
        console.error("Failed to reuse existing payment intent", error)
        paymentIntent = null
      }
    }

    if (!paymentIntent) {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInSmallestUnit,
        currency: invoiceCurrency.toLowerCase(),
        customer: invoice.stripe_customer_id ?? undefined,
        description: invoice.description ?? `Payment for invoice ${invoice.id}`,
        metadata: {
          invoice_id: invoice.id,
          tenant_id: invoice.tenant_id,
          ...(invoice.unit_id ? { unit_id: invoice.unit_id } : {}),
        },
        automatic_payment_methods: { enabled: true },
      })

      const { error: updateError } = await serviceRoleClient
        .from("rent_invoices")
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq("id", invoice.id)

      if (updateError) {
        console.error("Failed to persist payment intent on invoice", updateError)
      }
    }

    if (!paymentIntent.client_secret) {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id)
    }

    if (!paymentIntent.client_secret) {
      return Response.json(
        { error: "Payment intent was created without a client secret." },
        { status: 500 },
      )
    }

    return Response.json({
      invoiceId: invoice.id,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: invoiceAmount,
      currency: invoiceCurrency,
      status: paymentIntent.status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error creating payment intent."
    console.error("Error creating invoice payment intent", error)
    return Response.json({ error: message }, { status: 500 })
  }
}
