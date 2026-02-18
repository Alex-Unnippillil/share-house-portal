import { createClient } from "@/utils/supabase/server"

import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"

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
    const triageStatus =
      typeof payload?.triageStatus === "string" ? payload.triageStatus : "open"
    const triageNotes =
      typeof payload?.triageNotes === "string" ? payload.triageNotes.trim() : ""

    if (!paymentId || !allowedTriageStatus.has(triageStatus)) {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "paymentId and a valid triageStatus are required.",
      })
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
    return jsonErrorFromUnknown(error, "DATA_FETCH_FAILED")
  }
}
