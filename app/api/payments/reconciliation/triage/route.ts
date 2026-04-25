import { createClient } from "@/utils/supabase/server"

import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { incrementOperationalMetric } from "@/lib/observability/metrics"

const allowedTriageStatus = new Set(["open", "investigating", "resolved"])

export async function PATCH(req: Request) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonError("AUTH_UNAUTHORIZED")
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile || !["property_manager", "admin"].includes(profile.role ?? "")) {
      return jsonError("AUTH_UNAUTHORIZED", {
        message: "Only property managers and admins can triage failed payments.",
      })
    }

    const payload = await req.json().catch(() => null)
    const paymentId = typeof payload?.paymentId === "string" ? payload.paymentId : null
    const recordType = payload?.recordType === "webhook_event" ? "webhook_event" : "rent_payment"
    const triageStatus =
      typeof payload?.triageStatus === "string" ? payload.triageStatus : "open"
    const triageNotes =
      typeof payload?.triageNotes === "string" ? payload.triageNotes.trim() : ""

    if (!paymentId || !allowedTriageStatus.has(triageStatus)) {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "paymentId and a valid triageStatus are required.",
      })
    }

    if (recordType === "webhook_event") {
      const { data: eventRow, error: eventError } = await supabase
        .from("webhook_events")
        .select("payload")
        .eq("provider", "stripe")
        .eq("event_id", paymentId)
        .single()

      if (eventError) {
        throw eventError
      }

      const existingPayload = (eventRow.payload ?? {}) as Record<string, unknown>
      const existingReconciliation =
        (existingPayload.reconciliation ?? {}) as Record<string, unknown>

      const { error: updateError } = await supabase
        .from("webhook_events")
        .update({
          payload: {
            ...existingPayload,
            reconciliation: {
              ...existingReconciliation,
              triage_status: triageStatus,
              triage_notes: triageNotes,
              triage_updated_by: user.id,
              triage_updated_at: new Date().toISOString(),
            },
          },
        })
        .eq("provider", "stripe")
        .eq("event_id", paymentId)

      if (updateError) {
        throw updateError
      }

      return Response.json({ ok: true })
    }

    const { data: payment, error: paymentError } = await supabase
      .from("rent_payments")
      .select("metadata")
      .eq("id", paymentId)
      .single()

    if (paymentError) {
      throw paymentError
    }

    const nextMetadata = {
      ...((payment.metadata ?? {}) as Record<string, unknown>),
      triage_status: triageStatus,
      triage_notes: triageNotes,
      triage_updated_by: user.id,
      triage_updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from("rent_payments")
      .update({ metadata: nextMetadata })
      .eq("id", paymentId)

    if (updateError) {
      throw updateError
    }

    return Response.json({ ok: true })
  } catch (error) {
    incrementOperationalMetric("payment_reconciliation_failures_total", {
      source: "payments_reconciliation_triage",
      provider: "supabase",
      reason: error instanceof Error ? error.message : "unknown_error",
      severity: "high",
    })

    return jsonErrorFromUnknown(error, "DATA_FETCH_FAILED")
  }
}
