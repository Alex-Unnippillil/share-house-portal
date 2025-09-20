'use server'

import { revalidatePath } from 'next/cache'

import { createStripeCheckoutSession } from '@/app/api/payments/stripe/route'
import type { Database } from '@/lib/supabase'
import {
  getSupabaseServerClient,
  type TypedSupabaseClient,
} from '@/utils/typed-supabase-client'

type LeaseRow = Database['public']['Tables']['leases']['Row']
type PropertyRow = Database['public']['Tables']['properties']['Row']
type UnitRow = Database['public']['Tables']['units']['Row']
type RentInvoiceRow = Database['public']['Tables']['rent_invoices']['Row']
type RentPaymentRow = Database['public']['Tables']['rent_payments']['Row']

type LeaseWithRelations = LeaseRow & {
  property: PropertyRow | null
  unit: UnitRow | null
}

type InvoiceWithPayments = RentInvoiceRow & {
  payments: RentPaymentRow[]
}

export type RentLedgerEntry = {
  invoice: RentInvoiceRow
  payments: RentPaymentRow[]
  amountDue: number
  paid: number
  balance: number
  isOverdue: boolean
}

export type RentOverview = {
  lease: LeaseWithRelations | null
  ledger: RentLedgerEntry[]
  outstandingTotal: number
  nextDueInvoice: RentLedgerEntry | null
  paymentHistory: RentPaymentRow[]
}

export type StartRentPaymentState = {
  status: 'idle' | 'success' | 'error'
  error?: string
  url?: string
  sessionId?: string
}

export const START_PAYMENT_DEFAULT_STATE: StartRentPaymentState = {
  status: 'idle',
}

export type ConfirmRentPaymentInput = {
  invoiceIds: string[]
  providerPaymentId: string
  sessionId: string
  status?: 'succeeded' | 'failed'
}

export async function loadRentOverview(): Promise<RentOverview> {
  const { supabase, user } = await requireUserClient()
  return buildRentOverview(supabase, user.id)
}

export async function startRentPayment(
  _prevState: StartRentPaymentState,
  formData: FormData,
): Promise<StartRentPaymentState> {
  try {
    const provider = (formData.get('provider') as string) || 'stripe'
    const invoiceIdsRaw = formData.get('invoiceIds')
    let invoiceIds: string[] = []

    if (typeof invoiceIdsRaw === 'string' && invoiceIdsRaw.length) {
      try {
        invoiceIds = JSON.parse(invoiceIdsRaw) as string[]
      } catch (error) {
        console.warn('Unable to parse invoiceIds payload', error)
      }
    }

    const { supabase, user } = await requireUserClient()
    const overview = await buildRentOverview(supabase, user.id)
    const lease = overview.lease

    if (!lease) {
      return { status: 'error', error: 'An active lease is required before rent can be paid.' }
    }

    const payableEntries = overview.ledger.filter((entry) => {
      if (entry.balance <= 0) {
        return false
      }

      if (!invoiceIds.length) {
        return true
      }

      return invoiceIds.includes(entry.invoice.id)
    })

    if (!payableEntries.length) {
      return {
        status: 'error',
        error: 'No open charges were found for the selected invoices.',
      }
    }

    const amount = payableEntries.reduce((sum, entry) => sum + entry.balance, 0)
    const currency = payableEntries[0]?.invoice.currency ?? 'usd'

    const session = await createStripeCheckoutSession({
      amount: Number(amount.toFixed(2)),
      currency,
      invoiceIds: payableEntries.map((entry) => entry.invoice.id),
      leaseId: lease.id,
    })

    const pendingPayments = payableEntries.map((entry) => ({
      lease_id: lease.id,
      invoice_id: entry.invoice.id,
      amount: entry.balance.toFixed(2),
      currency: entry.invoice.currency ?? currency,
      status: 'pending' as RentPaymentRow['status'],
      payment_provider: provider,
      provider_session_id: session.sessionId,
    }))

    const { error: insertError } = await supabase
      .from('rent_payments')
      .insert(pendingPayments)

    if (insertError) {
      return { status: 'error', error: insertError.message }
    }

    revalidatePath('/rent')

    return {
      status: 'success',
      url: session.url,
      sessionId: session.sessionId,
    }
  } catch (error) {
    console.error('startRentPayment error', error)
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unable to start the payment session.',
    }
  }
}

export async function confirmRentPayment(input: ConfirmRentPaymentInput) {
  try {
    const { supabase, user } = await requireUserClient()
    const lease = await fetchActiveLease(supabase, user.id)

    if (!lease) {
      return { success: false, error: 'No active lease was found for the current tenant.' }
    }

    const now = new Date().toISOString()

    let updateBuilder = supabase
      .from('rent_payments')
      .update({
        status: input.status ?? 'succeeded',
        provider_payment_id: input.providerPaymentId,
        processed_at: now,
      })
      .eq('lease_id', lease.id)
      .eq('provider_session_id', input.sessionId)

    if (input.invoiceIds.length) {
      updateBuilder = updateBuilder.in('invoice_id', input.invoiceIds)
    }

    const { error: updateError } = await updateBuilder

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    for (const invoiceId of input.invoiceIds) {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('rent_invoices')
        .select(
          `
            id,
            amount_due,
            status,
            payments:rent_payments (amount, status)
          `,
        )
        .eq('id', invoiceId)
        .maybeSingle()

      if (invoiceError || !invoiceData) {
        continue
      }

      const amountDue = toNumber(invoiceData.amount_due)
      const paid = (invoiceData.payments ?? [])
        .filter((payment) => payment.status === 'succeeded')
        .reduce((total, payment) => total + toNumber(payment.amount), 0)

      if (paid >= amountDue && invoiceData.status !== 'paid') {
        await supabase
          .from('rent_invoices')
          .update({ status: 'paid', updated_at: now })
          .eq('id', invoiceId)
      }
    }

    revalidatePath('/rent')

    return { success: true }
  } catch (error) {
    console.error('confirmRentPayment error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to confirm the rent payment.',
    }
  }
}

async function buildRentOverview(
  supabase: TypedSupabaseClient,
  userId: string,
): Promise<RentOverview> {
  const lease = await fetchActiveLease(supabase, userId)

  if (!lease) {
    return {
      lease: null,
      ledger: [],
      outstandingTotal: 0,
      nextDueInvoice: null,
      paymentHistory: [],
    }
  }

  const ledger = await fetchLedger(supabase, lease.id)
  const outstandingTotal = ledger.reduce((sum, entry) => sum + entry.balance, 0)
  const nextDueInvoice = ledger.find((entry) => entry.balance > 0) ?? null

  const { data: paymentHistory = [] } = await supabase
    .from('rent_payments')
    .select('*')
    .eq('lease_id', lease.id)
    .order('created_at', { ascending: false })

  return {
    lease,
    ledger,
    outstandingTotal,
    nextDueInvoice,
    paymentHistory,
  }
}

async function fetchActiveLease(
  supabase: TypedSupabaseClient,
  userId: string,
): Promise<LeaseWithRelations | null> {
  const { data, error } = await supabase
    .from('leases')
    .select(
      `
        id,
        property_id,
        unit_id,
        tenant_id,
        start_date,
        end_date,
        status,
        rent_amount,
        deposit_amount,
        created_at,
        updated_at,
        property:properties (
          id,
          name,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country,
          status
        ),
        unit:units (
          id,
          name,
          status,
          rent_amount,
          bedrooms,
          bathrooms,
          square_feet
        )
      `,
    )
    .eq('tenant_id', userId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as LeaseWithRelations | null) ?? null
}

async function fetchLedger(
  supabase: TypedSupabaseClient,
  leaseId: string,
): Promise<RentLedgerEntry[]> {
  const { data, error } = await supabase
    .from('rent_invoices')
    .select(
      `
        id,
        lease_id,
        due_date,
        period_start,
        period_end,
        amount_due,
        status,
        description,
        currency,
        created_at,
        updated_at,
        payments:rent_payments (
          id,
          amount,
          status,
          payment_provider,
          provider_session_id,
          provider_payment_id,
          currency,
          created_at,
          processed_at
        )
      `,
    )
    .eq('lease_id', leaseId)
    .order('due_date', { ascending: true })

  if (error) {
    throw error
  }

  const invoices = (data as unknown as InvoiceWithPayments[]) ?? []

  return invoices.map((invoice) => {
    const amountDue = toNumber(invoice.amount_due)
    const paid = (invoice.payments ?? [])
      .filter((payment) => payment.status === 'succeeded')
      .reduce((total, payment) => total + toNumber(payment.amount), 0)
    const balance = Math.max(amountDue - paid, 0)
    const isOverdue = balance > 0 && isPastDue(invoice.due_date)

    return {
      invoice,
      payments: invoice.payments ?? [],
      amountDue,
      paid,
      balance,
      isOverdue,
    }
  })
}

async function requireUserClient() {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error('You must be signed in to access rent details.')
  }

  return { supabase, user }
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  return 0
}

function isPastDue(dueDate: string | null) {
  if (!dueDate) {
    return false
  }

  const due = new Date(dueDate)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return due < today
}
