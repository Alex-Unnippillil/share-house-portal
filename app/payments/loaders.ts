"use server"

import "server-only"

import { createClient } from "@/utils/supabase/server"
import {
  catchUpBalances,
  receiptHistory,
  roommateLedgers,
} from "@/lib/payments/mock-data"
import type { Tables } from "@/lib/supabase"
import type {
  CatchUpBalance,
  PaymentReceiptHistoryEntry,
  RoommateLedger,
} from "@/types/payments"

function mapPaymentStatusToReceiptStatus(
  status: Tables<"rent_payments">["status"]
): PaymentReceiptHistoryEntry["status"] {
  if (status === "failed" || status === "cancelled") {
    return "refunded"
  }

  if (status === "pending") {
    return "processing"
  }

  return "paid"
}

function buildFallbackReceiptUrl(paymentId: string) {
  return `https://dashboard.stripe.com/payments/${paymentId}`
}

export async function loadCatchUpBalances(): Promise<CatchUpBalance[]> {
  return catchUpBalances
}

export async function loadReceiptHistory(): Promise<PaymentReceiptHistoryEntry[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return receiptHistory
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const isManager = profile?.role === "property_manager" || profile?.role === "admin"

  let query = supabase
    .from("rent_payments")
    .select(
      "id, amount, currency, status, processed_at, created_at, payment_method_type, description, receipt_url, billing_period_start, billing_period_end, metadata, payer_name"
    )
    .order("processed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100)

  if (!isManager) {
    query = query.eq("user_id", user.id)
  }

  const { data, error } = await query

  if (error || !data) {
    return receiptHistory
  }

  return data.map((payment) => {
    const metadata = (payment.metadata ?? {}) as Record<string, unknown>

    return {
      id: payment.id,
      issuedTo: payment.payer_name ?? "Tenant",
      paymentDate: payment.processed_at ?? payment.created_at ?? new Date().toISOString(),
      currency: payment.currency,
      amount: payment.amount,
      status: mapPaymentStatusToReceiptStatus(payment.status),
      paymentMethod: payment.payment_method_type ?? "card",
      periodStart: payment.billing_period_start ?? undefined,
      periodEnd: payment.billing_period_end ?? undefined,
      receiptUrl:
        payment.receipt_url ??
        (typeof metadata.receipt_url === "string"
          ? metadata.receipt_url
          : buildFallbackReceiptUrl(payment.id)),
      invoiceUrl:
        typeof metadata.invoice_url === "string" ? metadata.invoice_url : undefined,
      memo: payment.description ?? undefined,
      lineItems: [
        {
          id: `${payment.id}-line-item`,
          description: payment.description ?? "Rent payment",
          category: "rent",
          quantity: 1,
          unitAmount: payment.amount,
          totalAmount: payment.amount,
        },
      ],
    }
  })
}

export interface ReconciliationPaymentItem {
  id: string
  recordType: "rent_payment" | "webhook_event"
  tenantName: string
  amount: number
  currency: string
  status: string
  description: string | null
  processedAt: string | null
  receiptUrl: string | null
  triageStatus: "open" | "investigating" | "resolved"
  triageNotes: string | null
  auditDetail: string | null
}

export interface ReconciliationDashboardData {
  canManagePayments: boolean
  failedPayments: ReconciliationPaymentItem[]
}

export async function loadReconciliationDashboardData(): Promise<ReconciliationDashboardData> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { canManagePayments: false, failedPayments: [] }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const canManagePayments =
    profile?.role === "property_manager" || profile?.role === "admin"

  if (!canManagePayments) {
    return { canManagePayments: false, failedPayments: [] }
  }

  const { data, error } = await supabase
    .from("rent_payments")
    .select("id, amount, currency, status, description, processed_at, receipt_url, metadata, payer_name")
    .eq("status", "failed")
    .order("processed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200)

  if (error || !data) {
    return { canManagePayments, failedPayments: [] }
  }

  const failedPayments: ReconciliationPaymentItem[] = data.map((payment) => {
    const metadata = (payment.metadata ?? {}) as Record<string, unknown>
    const triageStatus =
      metadata.triage_status === "investigating" || metadata.triage_status === "resolved"
        ? metadata.triage_status
        : "open"

    return {
      id: payment.id,
      recordType: "rent_payment",
      tenantName: payment.payer_name ?? "Unassigned tenant",
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: payment.description,
      processedAt: payment.processed_at,
      receiptUrl: payment.receipt_url,
      triageStatus,
      triageNotes:
        typeof metadata.triage_notes === "string" ? metadata.triage_notes : null,
      auditDetail: null,
    }
  })

  const { data: queuedEvents } = await supabase
    .from("webhook_events")
    .select("event_id, event_type, created_at, error_message, payload")
    .eq("provider", "stripe")
    .eq("status", "failed")
    .ilike("error_message", "%map%tenant%")
    .order("created_at", { ascending: false })
    .limit(200)

  const unmappedEvents: ReconciliationPaymentItem[] = (queuedEvents ?? []).map((event) => {
    const payload = (event.payload ?? {}) as Record<string, unknown>
    const reconciliation = (payload.reconciliation ?? {}) as Record<string, unknown>
    const triageStatus =
      reconciliation.triage_status === "investigating" ||
      reconciliation.triage_status === "resolved"
        ? reconciliation.triage_status
        : "open"

    return {
      id: event.event_id,
      recordType: "webhook_event",
      tenantName: "Unmapped Stripe event",
      amount: 0,
      currency: "USD",
      status: "unmapped",
      description: event.event_type,
      processedAt: event.created_at,
      receiptUrl: null,
      triageStatus,
      triageNotes:
        typeof reconciliation.triage_notes === "string" ? reconciliation.triage_notes : null,
      auditDetail: typeof event.error_message === "string" ? event.error_message : null,
    }
  })

  return { canManagePayments, failedPayments: [...unmappedEvents, ...failedPayments] }
}

export async function loadRoommateLedgers(): Promise<RoommateLedger[]> {
  return roommateLedgers
}
