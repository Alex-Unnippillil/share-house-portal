import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import { jsonError } from "@/lib/errors"
import { sendBulkNotifications } from "@/lib/notifications"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"

const updateVisitorSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "completed"]),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  decisionNotes: z.string().trim().max(500).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient(cookies()) as SupabaseClient<Database>

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return jsonError("AUTH_UNAUTHORIZED")
  }

  const { data: actor } = await supabase
    .from("profiles")
    .select("id, role, unit_id, full_name, email")
    .eq("id", user.id)
    .maybeSingle()

  if (!actor || !actor.unit_id) {
    return jsonError("AUTH_UNAUTHORIZED", { message: "Forbidden" })
  }

  const payload = updateVisitorSchema.safeParse(await request.json())
  if (!payload.success) {
    return jsonError("REQUEST_VALIDATION_ERROR", {
      message: "Invalid payload",
      details: payload.error.flatten(),
    })
  }

  const { data: log, error: logError } = await supabase
    .from("visitor_logs")
    .select("*")
    .eq("id", params.id)
    .eq("unit_id", actor.unit_id)
    .maybeSingle()

  if (logError || !log) {
    return jsonError("DATA_FETCH_FAILED", { message: "Visitor log not found" })
  }

  const isManager = actor.role === "property_manager" || actor.role === "admin"
  const isOwner = log.host_id === actor.id

  if (!isOwner && !isManager) {
    return jsonError("AUTH_UNAUTHORIZED", { message: "Forbidden" })
  }

  if ((payload.data.status === "approved" || payload.data.status === "rejected") && !isManager) {
    return jsonError("AUTH_UNAUTHORIZED", { message: "Manager permissions required" })
  }

  const patch: Record<string, unknown> = {
    status: payload.data.status,
    approval_status:
      payload.data.approvalStatus ??
      (payload.data.status === "approved"
        ? "approved"
        : payload.data.status === "rejected"
        ? "rejected"
        : "pending"),
    decision_notes: payload.data.decisionNotes,
    last_action_by: actor.id,
    last_action_at: new Date().toISOString(),
  }

  if (payload.data.status === "approved" || payload.data.status === "rejected") {
    patch.approved_by = actor.id
    patch.approved_at = new Date().toISOString()
  }

  const { data: updated, error: updateError } = await (supabase as any)
    .from("visitor_logs")
    .update(patch)
    .eq("id", params.id)
    .select("*")
    .single()

  if (updateError) {
    return jsonError("DATA_FETCH_FAILED", { message: updateError.message })
  }

  await (supabase as any).from("visitor_log_audit_entries").insert({
    visitor_log_id: params.id,
    actor_id: actor.id,
    action: payload.data.status,
    notes: payload.data.decisionNotes ?? null,
    metadata: {
      approvalStatus: patch.approval_status,
    },
  })

  const { data: recipients } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("unit_id", actor.unit_id)
    .neq("id", actor.id)

  const notifications = (recipients ?? []).flatMap((recipient) => {
    if (!recipient.email) return []
    return [
      {
        to: recipient.email,
        subject: `Visitor request ${payload.data.status}: ${updated.guest_name}`,
        template: "visitor-booking",
        data: {
          guestName: updated.guest_name,
          hostName: actor.full_name ?? actor.email ?? "Unknown",
          checkInDate: updated.check_in_date,
          checkOutDate: updated.check_out_date,
          purpose: updated.reason,
        },
        userId: recipient.id,
      },
      {
        userId: recipient.id,
        title: "Visitor request updated",
        message: `${updated.guest_name} request is now ${payload.data.status}.`,
        type:
          payload.data.status === "approved"
            ? ("success" as const)
            : payload.data.status === "rejected"
            ? ("warning" as const)
            : ("info" as const),
        actionUrl: "/visitors",
        metadata: { visitorLogId: params.id, status: payload.data.status },
      },
    ]
  })

  if (notifications.length > 0) {
    await sendBulkNotifications(notifications)
  }

  return NextResponse.json({ data: updated })
}
