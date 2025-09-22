"use server"

import Stripe from "stripe"
import { cookies } from "next/headers"
import { z } from "zod"

import { resolveInvoiceStatus, type PaymentIntentStatus, type PaymentMethodType } from "./utils"
import { createClient } from "@/utils/supa-server-actions"

const stripeSecret = process.env.STRIPE_SECRET_KEY
const stripeClient = stripeSecret
  ? new Stripe(stripeSecret, {
      apiVersion: "2024-06-20",
    })
  : null

function assertStripe() {
  if (!stripeClient) {
    throw new Error("Stripe secret key is not configured")
  }

  return stripeClient
}

const initiateSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().int().positive(),
  paymentMethodType: z.custom<PaymentMethodType>((value) => value === "card" || value === "acss_debit"),
})

export type PaymentInitiationInput = z.infer<typeof initiateSchema>

export type PaymentInitiationResult = {
  clientSecret: string
  paymentIntentId: string
  status: PaymentIntentStatus
  amount: number
  currency: string
}

export async function initiatePayment(input: PaymentInitiationInput): Promise<PaymentInitiationResult> {
  const payload = initiateSchema.parse(input)

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("You must be signed in to initiate a payment")
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, tenant_id, amount_due, currency, status, stripe_customer_id")
    .eq("id", payload.invoiceId)
    .eq("tenant_id", user.id)
    .maybeSingle()

  if (invoiceError) {
    throw new Error(invoiceError.message)
  }

  if (!invoice) {
    throw new Error("Invoice could not be found")
  }

  if (invoice.amount_due <= 0) {
    throw new Error("This invoice is already settled")
  }

  if (payload.amount > invoice.amount_due) {
    throw new Error("Cannot pay more than the outstanding balance")
  }

  if (payload.amount < 50) {
    throw new Error("Payments must be at least $0.50")
  }

  const stripe = assertStripe()

  const paymentIntent = await stripe.paymentIntents.create({
    amount: payload.amount,
    currency: invoice.currency,
    customer: invoice.stripe_customer_id ?? undefined,
    payment_method_types: [payload.paymentMethodType],
    metadata: {
      invoice_id: invoice.id,
      tenant_id: invoice.tenant_id,
      initiated_by: user.id,
    },
    receipt_email: user.email ?? undefined,
    setup_future_usage: payload.paymentMethodType === "acss_debit" ? "off_session" : undefined,
    ...(payload.paymentMethodType === "acss_debit"
      ? {
          payment_method_options: {
            acss_debit: {
              mandate_options: {
                payment_schedule: "sporadic",
                transaction_type: "personal",
              },
            },
          },
        }
      : {}),
  })

  if (!paymentIntent.client_secret) {
    throw new Error("Stripe did not return a client secret")
  }

  const now = new Date().toISOString()

  const { error: paymentError } = await supabase
    .from("payments")
    .upsert(
      {
        invoice_id: invoice.id,
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        payment_method_type: payload.paymentMethodType,
        client_secret: paymentIntent.client_secret ?? null,
        updated_at: now,
      },
      { onConflict: "payment_intent_id" }
    )

  if (paymentError) {
    throw new Error(paymentError.message)
  }

  if (invoice.status === "open" || invoice.status === "partial") {
    await supabase
      .from("invoices")
      .update({ status: "pending", updated_at: now })
      .eq("id", invoice.id)
  }

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status as PaymentIntentStatus,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
  }
}

const updateSchema = z.object({
  paymentIntentId: z.string().min(1),
  status: z.custom<PaymentIntentStatus>((value) =>
    [
      "canceled",
      "processing",
      "requires_action",
      "requires_capture",
      "requires_confirmation",
      "requires_payment_method",
      "succeeded",
    ].includes(value as PaymentIntentStatus)
  ),
})

export type PaymentUpdateInput = z.infer<typeof updateSchema>

export type PaymentUpdateResult = {
  status: PaymentIntentStatus
  invoiceStatus: string
  remainingAmount: number
}

export async function updatePaymentRecord(input: PaymentUpdateInput): Promise<PaymentUpdateResult> {
  const payload = updateSchema.parse(input)

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("You must be signed in to update payments")
  }

  const { data: payment, error: paymentLookupError } = await supabase
    .from("payments")
    .select("invoice_id, amount")
    .eq("payment_intent_id", payload.paymentIntentId)
    .maybeSingle()

  if (paymentLookupError) {
    throw new Error(paymentLookupError.message)
  }

  if (!payment) {
    throw new Error("Payment record not found")
  }

  const { data: invoice, error: invoiceLookupError } = await supabase
    .from("invoices")
    .select("id, tenant_id, amount_due, status")
    .eq("id", payment.invoice_id)
    .maybeSingle()

  if (invoiceLookupError) {
    throw new Error(invoiceLookupError.message)
  }

  if (!invoice || invoice.tenant_id !== user.id) {
    throw new Error("You are not authorized to modify this payment")
  }

  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from("payments")
    .update({ status: payload.status, updated_at: now })
    .eq("payment_intent_id", payload.paymentIntentId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  const { nextStatus, remainingAmount } = resolveInvoiceStatus(payload.status, invoice.amount_due, payment.amount)

  const invoiceUpdate: Record<string, unknown> = {
    status: nextStatus,
    updated_at: now,
  }

  if (payload.status === "succeeded") {
    invoiceUpdate.amount_due = remainingAmount
  }

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update(invoiceUpdate)
    .eq("id", invoice.id)

  if (invoiceUpdateError) {
    throw new Error(invoiceUpdateError.message)
  }

  return {
    status: payload.status,
    invoiceStatus: nextStatus,
    remainingAmount,
  }
}
