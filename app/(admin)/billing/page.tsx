import type { Metadata } from "next"

import { BillingAuditLog, type BillingAuditEvent } from "@/components/billing/audit-log"
import { InvoiceAdjustmentForm, type InvoiceSummary } from "@/components/billing/adjustment-form"
import { LedgerTable, type LedgerEntry } from "@/components/billing/ledger-table"
import { createSupbaseServerClient } from "@/utils/supaone"

import { BILLING_EVENT_TYPE } from "./constants"

export const metadata: Metadata = {
  title: "Billing adjustments",
  description: "Administer invoice credits, reversals, and audit trails for resident accounts.",
}

type InvoiceRow = {
  id: string
  reference?: string | null
  balance_cents: number
  currency?: string | null
}

type AdjustmentRow = {
  id: string
  created_at: string
  amount_cents: number
  reason: string
  memo?: string | null
  type: "credit" | "reversal"
  created_by: string
  invoice?: {
    id: string
    reference?: string | null
    currency?: string | null
  } | null
  actor?: {
    full_name?: string | null
    email?: string | null
  } | null
}

type AuditEventRow = {
  id: string
  created_at: string
  event_type: string
  payload?: Record<string, unknown> | null
  actor?: {
    full_name?: string | null
    email?: string | null
  } | null
}

export default async function BillingAdminPage() {
  const supabase = await createSupbaseServerClient()

  const [invoicesResult, adjustmentsResult, auditResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, reference, balance_cents, currency")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("invoice_adjustments")
      .select(
        "id, created_at, amount_cents, reason, memo, type, created_by, invoice:invoices(id, reference, currency), actor:profiles(full_name, email)"
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("events")
      .select("id, created_at, event_type, payload, actor:profiles(full_name, email)")
      .eq("event_type", BILLING_EVENT_TYPE)
      .order("created_at", { ascending: false })
      .limit(25),
  ])

  if (invoicesResult.error) {
    console.error("Failed to load invoices", invoicesResult.error)
  }

  if (adjustmentsResult.error) {
    console.error("Failed to load invoice adjustments", adjustmentsResult.error)
  }

  if (auditResult.error) {
    console.error("Failed to load audit events", auditResult.error)
  }

  const invoices: InvoiceSummary[] = (invoicesResult.data as InvoiceRow[] | null)?.map((invoice) => ({
    id: invoice.id,
    reference: invoice.reference,
    balance_cents: invoice.balance_cents,
    currency: invoice.currency ?? "USD",
  })) ?? []

  const adjustments: LedgerEntry[] = (adjustmentsResult.data as AdjustmentRow[] | null)?.map((entry) => ({
    id: entry.id,
    created_at: entry.created_at,
    amount_cents: entry.amount_cents,
    reason: entry.reason,
    memo: entry.memo,
    type: entry.type,
    created_by: entry.created_by,
    invoice: entry.invoice ?? null,
    actor: entry.actor ?? null,
  })) ?? []

  const auditEvents: BillingAuditEvent[] = (auditResult.data as AuditEventRow[] | null)?.map((event) => ({
    id: event.id,
    created_at: event.created_at,
    event_type: event.event_type,
    payload: event.payload ?? {},
    actor: event.actor ?? null,
  })) ?? []

  return (
    <div className="container max-w-6xl space-y-10 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Billing adjustments</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Issue ledger credits and reversals when rent, deposits, or utility balances need manual intervention. Every action is
          fully audited.
        </p>
      </div>

      <InvoiceAdjustmentForm invoices={invoices} />

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <LedgerTable adjustments={adjustments} />
        <BillingAuditLog events={auditEvents} />
      </div>
    </div>
  )
}
