"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createSupbaseServerClient } from "@/utils/supaone"
import type {
  LeaseRow,
  PropertyRow,
  RentInvoiceRow,
  RentPaymentRow,
  UnitRow,
} from "@/utils/typed-supabase-client"
import { createStripeCheckoutSession } from "@/app/api/payments/stripe/route"

const startPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  provider: z.string().min(1).default("stripe"),
})

const confirmPaymentSchema = z
  .object({
    paymentId: z.string().uuid().optional(),
    providerSessionId: z.string().optional(),
    providerPaymentId: z.string().optional(),
    invoiceId: z.string().uuid().optional(),
    amount: z.number().positive().optional(),
    status: z
      .enum(["succeeded", "failed", "refunded"])
      .default("succeeded"),
    receiptUrl: z.string().url().optional(),
  })
  .refine(
    (value) => Boolean(value.paymentId ?? value.providerSessionId),
    "A payment identifier is required to confirm rent payments."
  )

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

type LeaseWithRelations = LeaseRow & {
  unit: (UnitRow & { property: PropertyRow | null }) | null
}

export type LeaseSummary = {
  id: string
  status: LeaseRow["status"]
  startDate: string
  endDate: string | null
  rentAmount: number
  depositAmount: number
  unit?: {
    id: string
    unitNumber: string
    status: UnitRow["status"]
    property?: {
      id: string
      name: string
      street: string | null
      city: string | null
      state: string | null
      postalCode: string | null
      country: string | null
    }
  }
}

export type RentLedgerInvoice = {
  id: string
  dueDate: string
  amount: number
  paidAmount: number
  balance: number
  status: RentInvoiceRow["status"]
  description: string | null
  periodStart: string | null
  periodEnd: string | null
}

export type RentLedgerPayment = {
  id: string
  createdAt: string
  processedAt: string | null
  amount: number
  status: RentPaymentRow["status"]
  provider: string
  providerSessionId: string | null
  providerPaymentId: string | null
  receiptUrl: string | null
  invoiceId: string | null
}

export type RentLedgerSummary = {
  outstandingBalance: number
  totalPaid: number
  nextDueDate: string | null
  nextInvoiceId: string | null
  formattedOutstanding: string
}

export type RentLedger = {
  lease: LeaseSummary | null
  invoices: RentLedgerInvoice[]
  payments: RentLedgerPayment[]
  summary: RentLedgerSummary
}

function parseAmount(value: number | string | null | undefined): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

async function getAuthenticatedClient() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw new Error(error.message)
  }

  if (!user) {
    throw new Error("You must be signed in to access rent details.")
  }

  return { supabase, user }
}

async function fetchActiveLease(
  supabase: Awaited<ReturnType<typeof createSupbaseServerClient>>,
  tenantId: string,
): Promise<LeaseWithRelations | null> {
  const { data, error } = await supabase
    .from("leases")
    .select(
      `id, status, start_date, end_date, rent_amount, deposit_amount, unit_id,
       unit:units (
         id,
         unit_number,
         status,
         property:properties (
           id,
           name,
           street,
           city,
           state,
           postal_code,
           country
         )
       )`
    )
    .eq("tenant_id", tenantId)
    .in("status", ["active", "pending"])
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const leaseWithRelations = data as LeaseWithRelations | null

  if (!leaseWithRelations) return null

  const isCurrent =
    (!leaseWithRelations.start_date || new Date(leaseWithRelations.start_date) <= new Date()) &&
    (!leaseWithRelations.end_date || new Date(leaseWithRelations.end_date) >= new Date())

  if (!isCurrent && leaseWithRelations.status !== "active") {
    return null
  }

  return leaseWithRelations
}

function toLeaseSummary(lease: LeaseWithRelations | null): LeaseSummary | null {
  if (!lease) return null

  const unit = lease.unit
  const property = unit?.property ?? null

  return {
    id: lease.id,
    status: lease.status,
    startDate: lease.start_date,
    endDate: lease.end_date,
    rentAmount: parseAmount(lease.rent_amount),
    depositAmount: parseAmount(lease.deposit_amount),
    unit: unit
      ? {
          id: unit.id,
          unitNumber: unit.unit_number,
          status: unit.status,
          property: property
            ? {
                id: property.id,
                name: property.name,
                street: property.street,
                city: property.city,
                state: property.state,
                postalCode: property.postal_code,
                country: property.country,
              }
            : undefined,
        }
      : undefined,
  }
}

export async function getActiveLease(): Promise<LeaseSummary | null> {
  const { supabase, user } = await getAuthenticatedClient()
  const lease = await fetchActiveLease(supabase, user.id)
  return toLeaseSummary(lease)
}

export async function getRentLedger(): Promise<RentLedger> {
  const { supabase, user } = await getAuthenticatedClient()
  const lease = await fetchActiveLease(supabase, user.id)
  const leaseSummary = toLeaseSummary(lease)

  if (!lease || !leaseSummary) {
    return {
      lease: null,
      invoices: [],
      payments: [],
      summary: {
        outstandingBalance: 0,
        totalPaid: 0,
        nextDueDate: null,
        nextInvoiceId: null,
        formattedOutstanding: currencyFormatter.format(0),
      },
    }
  }

  const [{ data: invoiceRows, error: invoiceError }, { data: paymentRows, error: paymentError }] =
    await Promise.all([
      supabase
        .from("rent_invoices")
        .select(
          "id, amount, paid_amount, due_date, status, description, period_start, period_end, created_at"
        )
        .eq("lease_id", lease.id)
        .order("due_date", { ascending: true }),
      supabase
        .from("rent_payments")
        .select(
          "id, amount, status, created_at, processed_at, provider, provider_session_id, provider_payment_id, receipt_url, invoice_id"
        )
        .eq("lease_id", lease.id)
        .order("created_at", { ascending: false }),
    ])

  if (invoiceError) {
    throw new Error(invoiceError.message)
  }

  if (paymentError) {
    throw new Error(paymentError.message)
  }

  const payments = (paymentRows ?? []).map<RentLedgerPayment>((payment) => ({
    id: payment.id,
    createdAt: payment.created_at,
    processedAt: payment.processed_at,
    amount: parseAmount(payment.amount),
    status: payment.status,
    provider: payment.provider,
    providerSessionId: payment.provider_session_id,
    providerPaymentId: payment.provider_payment_id,
    receiptUrl: payment.receipt_url,
    invoiceId: payment.invoice_id,
  }))

  const succeededPaymentsByInvoice = payments.reduce<Record<string, number>>((acc, payment) => {
    if (payment.invoiceId && payment.status === "succeeded") {
      acc[payment.invoiceId] = (acc[payment.invoiceId] ?? 0) + payment.amount
    }
    return acc
  }, {})

  const invoices = (invoiceRows ?? []).map<RentLedgerInvoice>((invoice) => {
    const manualPaid = parseAmount(invoice.paid_amount)
    const paymentsForInvoice = succeededPaymentsByInvoice[invoice.id] ?? 0
    const amountDue = parseAmount(invoice.amount)
    const balance = Math.max(0, amountDue - (manualPaid + paymentsForInvoice))

    return {
      id: invoice.id,
      dueDate: invoice.due_date,
      amount: amountDue,
      paidAmount: manualPaid + paymentsForInvoice,
      balance,
      status: invoice.status,
      description: invoice.description,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
    }
  })

  const outstandingBalance = invoices.reduce((total, invoice) => total + invoice.balance, 0)
  const totalPaid = invoices.reduce((total, invoice) => total + invoice.paidAmount, 0)
  const nextInvoice = invoices.find((invoice) => invoice.balance > 0) ?? null

  return {
    lease: leaseSummary,
    invoices,
    payments,
    summary: {
      outstandingBalance,
      totalPaid,
      nextDueDate: nextInvoice?.dueDate ?? null,
      nextInvoiceId: nextInvoice?.id ?? null,
      formattedOutstanding: currencyFormatter.format(outstandingBalance),
    },
  }
}

export async function startRentPaymentSession(input: unknown) {
  const { supabase, user } = await getAuthenticatedClient()
  const payload = startPaymentSchema.parse(input ?? {})

  const { data: invoiceRow, error } = await supabase
    .from("rent_invoices")
    .select("id, lease_id, amount, paid_amount, status")
    .eq("id", payload.invoiceId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const invoice = invoiceRow as RentInvoiceRow | null

  if (!invoice) {
    return { error: "Invoice not found." }
  }

  const lease = await fetchActiveLease(supabase, user.id)

  if (!lease || lease.id !== invoice.lease_id) {
    return { error: "You can only pay invoices tied to your active lease." }
  }

  const outstanding = Math.max(
    0,
    parseAmount(invoice.amount) - parseAmount(invoice.paid_amount ?? 0)
  )

  if (outstanding <= 0) {
    return { error: "This invoice is already settled." }
  }

  const session = await createStripeCheckoutSession({
    amount: outstanding,
    currency: "usd",
    customerEmail: user.email ?? undefined,
    metadata: {
      invoiceId: invoice.id,
      leaseId: invoice.lease_id,
      tenantId: user.id,
    },
  })

  const { data: payment, error: paymentError } = await supabase
    .from("rent_payments")
    .insert({
      lease_id: invoice.lease_id,
      invoice_id: invoice.id,
      provider: payload.provider,
      provider_session_id: session.id,
      amount: outstanding,
      status: "pending",
    })
    .select("id")
    .maybeSingle()

  if (paymentError) {
    throw new Error(paymentError.message)
  }

  return {
    sessionId: session.id,
    url: session.url,
    paymentId: payment?.id ?? null,
    amount: outstanding,
  }
}

export async function confirmRentPayment(input: unknown) {
  const { supabase, user } = await getAuthenticatedClient()
  const payload = confirmPaymentSchema.parse(input ?? {})

  const query = supabase
    .from("rent_payments")
    .select("*")

  if (payload.paymentId) {
    query.eq("id", payload.paymentId)
  } else if (payload.providerSessionId) {
    query.eq("provider_session_id", payload.providerSessionId)
  }

  const { data: paymentRow, error } = await query.maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const payment = paymentRow as RentPaymentRow | null

  if (!payment) {
    return { error: "Payment session not found." }
  }

  const { data: leaseRow, error: leaseError } = await supabase
    .from("leases")
    .select("id, tenant_id")
    .eq("id", payment.lease_id)
    .maybeSingle()

  if (leaseError) {
    throw new Error(leaseError.message)
  }

  const lease = leaseRow as Pick<LeaseRow, "id" | "tenant_id"> | null

  if (!lease || lease.tenant_id !== user.id) {
    return { error: "You are not allowed to confirm this payment." }
  }

  const paymentAmount = payload.amount ?? parseAmount(payment.amount)
  const status = payload.status
  const processedAt = new Date().toISOString()

  const { error: updatePaymentError } = await supabase
    .from("rent_payments")
    .update({
      amount: paymentAmount,
      status,
      provider_payment_id: payload.providerPaymentId ?? payment.provider_payment_id ?? null,
      processed_at: processedAt,
      receipt_url: payload.receiptUrl ?? payment.receipt_url ?? null,
    })
    .eq("id", payment.id)

  if (updatePaymentError) {
    throw new Error(updatePaymentError.message)
  }

  if (payment.invoice_id) {
    const { data: invoiceRow, error: invoiceFetchError } = await supabase
      .from("rent_invoices")
      .select("id, amount, paid_amount, status")
      .eq("id", payment.invoice_id)
      .maybeSingle()

    if (invoiceFetchError) {
      throw new Error(invoiceFetchError.message)
    }

    const invoice = invoiceRow as RentInvoiceRow | null

    if (invoice) {
      const invoiceTotal = parseAmount(invoice.amount)
      const alreadyPaid = parseAmount(invoice.paid_amount)
      const newPaid = status === "succeeded" ? alreadyPaid + paymentAmount : alreadyPaid
      const normalizedPaid = Math.min(invoiceTotal, newPaid)

      let nextStatus = invoice.status
      if (invoice.status !== "void") {
        if (status === "succeeded") {
          nextStatus = normalizedPaid >= invoiceTotal ? "paid" : "open"
        } else if (status === "refunded") {
          nextStatus = "open"
        }
      }

      const { error: invoiceUpdateError } = await supabase
        .from("rent_invoices")
        .update({
          paid_amount: normalizedPaid,
          status: nextStatus,
        })
        .eq("id", invoice.id)

      if (invoiceUpdateError) {
        throw new Error(invoiceUpdateError.message)
      }
    }
  }

  revalidatePath("/rent")
  revalidatePath("/dashboard")

  return { success: true }
}

export const rentActionHelpers = {
  parseAmount,
  currencyFormatter,
}
