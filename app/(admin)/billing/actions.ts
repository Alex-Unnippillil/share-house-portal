"use server"

import { revalidatePath } from "next/cache"

import { ADMIN_ROLE, BILLING_EVENT_TYPE } from "./constants"
import { invoiceAdjustmentSchema, type InvoiceAdjustmentInput } from "./schemas"
import { createSupbaseServerClient } from "@/utils/supaone"

type InvoiceRow = {
  id: string
  balance_cents: number
  currency?: string | null
}

type AdjustmentInsert = {
  invoice_id: string
  amount_cents: number
  reason: string
  memo?: string | null
  type: InvoiceAdjustmentInput["type"]
  created_by: string
}

type AdjustmentRow = AdjustmentInsert & {
  id: string
  created_at: string
}

type AuditEventInsert = {
  actor_id: string
  event_type: string
  resource: string
  resource_id: string
  payload: Record<string, unknown>
}

function formatSupabaseError(message: string, error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return `${message}: ${error.message}`
  }

  return message
}

export async function applyInvoiceAdjustment(input: InvoiceAdjustmentInput) {
  const payload = invoiceAdjustmentSchema.parse(input)
  const supabase = await createSupbaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw new Error(formatSupabaseError("Unable to verify session", authError))
  }

  if (!user) {
    throw new Error("You must be signed in to record billing adjustments.")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single()

  if (profileError) {
    throw new Error(formatSupabaseError("Failed to load admin profile", profileError))
  }

  if (!profile || profile.role !== ADMIN_ROLE) {
    throw new Error("Only administrators can create billing adjustments.")
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, balance_cents, currency")
    .eq("id", payload.invoiceId)
    .single()

  if (invoiceError || !invoice) {
    throw new Error(formatSupabaseError("Invoice could not be found", invoiceError))
  }

  const adjustmentCents = Math.round(payload.amount * 100)
  const signedAmountCents = payload.type === "credit" ? adjustmentCents * -1 : adjustmentCents
  const nextBalanceCents = invoice.balance_cents + signedAmountCents

  if (nextBalanceCents < 0) {
    throw new Error("Adjustments cannot reduce an invoice balance below zero.")
  }

  const adjustmentInsert: AdjustmentInsert = {
    invoice_id: invoice.id,
    amount_cents: signedAmountCents,
    reason: payload.reason,
    memo: payload.memo ?? null,
    type: payload.type,
    created_by: user.id,
  }

  const { data: adjustment, error: adjustmentError } = await supabase
    .from("invoice_adjustments")
    .insert(adjustmentInsert)
    .select("id, created_at, invoice_id, amount_cents, reason, memo, type, created_by")
    .single()

  if (adjustmentError || !adjustment) {
    throw new Error(formatSupabaseError("Failed to create adjustment entry", adjustmentError))
  }

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update({ balance_cents: nextBalanceCents, updated_at: new Date().toISOString() })
    .eq("id", invoice.id)

  if (invoiceUpdateError) {
    throw new Error(formatSupabaseError("Failed to update invoice balance", invoiceUpdateError))
  }

  const auditEvent: AuditEventInsert = {
    actor_id: user.id,
    event_type: BILLING_EVENT_TYPE,
    resource: "invoice",
    resource_id: invoice.id,
    payload: {
      adjustment_id: adjustment.id,
      amount_cents: signedAmountCents,
      reason: payload.reason,
      memo: payload.memo ?? null,
      type: payload.type,
      previous_balance_cents: invoice.balance_cents,
      next_balance_cents: nextBalanceCents,
      currency: invoice.currency ?? "USD",
    },
  }

  const { error: auditError } = await supabase.from("events").insert(auditEvent)

  if (auditError) {
    throw new Error(formatSupabaseError("Failed to record billing audit event", auditError))
  }

  revalidatePath("/payments")
  revalidatePath("/admin/billing")
  revalidatePath(`/admin/billing/${invoice.id}`)

  return {
    adjustment: adjustment as AdjustmentRow,
    invoice: {
      ...invoice,
      balance_cents: nextBalanceCents,
    } satisfies InvoiceRow,
  }
}
