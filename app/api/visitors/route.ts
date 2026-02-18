import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import { jsonError } from "@/lib/errors"
import { sendBulkNotifications } from "@/lib/notifications"
import type { Database } from "@/lib/supabase"
import { createVisitorLogCsv, evaluateVisitorPolicy, type VisitorPolicy } from "@/lib/visitors"
import { createClient } from "@/utils/supa-server-actions"

const createVisitorSchema = z.object({
  guestName: z.string().trim().min(2),
  guestEmail: z.string().trim().email(),
  guestPhone: z.string().trim().optional(),
  arrivalDate: z.string().datetime(),
  departureDate: z.string().datetime(),
  hostRoommateId: z.string().uuid(),
  reason: z.string().trim().min(10),
  emergencyContact: z.string().trim().optional(),
  specialNotes: z.string().trim().optional(),
})

function defaultPolicy(): VisitorPolicy {
  return {
    maxConsecutiveNights: 3,
    requiresManagerApproval: true,
    blackoutWindows: [],
  }
}

async function loadPolicy(
  supabase: SupabaseClient<Database>,
  unitId: string
): Promise<VisitorPolicy> {
  const { data } = await (supabase as any)
    .from("visitor_unit_policies")
    .select("max_consecutive_nights,requires_manager_approval,blackout_windows")
    .eq("unit_id", unitId)
    .maybeSingle()

  if (!data) return defaultPolicy()

  return {
    maxConsecutiveNights: data.max_consecutive_nights ?? 3,
    requiresManagerApproval: data.requires_manager_approval ?? true,
    blackoutWindows: Array.isArray(data.blackout_windows) ? data.blackout_windows : [],
  }
}

async function loadViewerProfile(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("AUTH_UNAUTHORIZED")
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, unit_id")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !profile || !profile.unit_id) {
    throw new Error("PROFILE_NOT_FOUND")
  }

  return { user, profile }
}

export async function GET(request: NextRequest) {
  const supabase = createClient(cookies()) as SupabaseClient<Database>

  try {
    const { profile } = await loadViewerProfile(supabase)
    const unitId = profile.unit_id as string

    const includeAudit = request.nextUrl.searchParams.get("includeAudit") === "true"
    const format = request.nextUrl.searchParams.get("format")

    let query = supabase
      .from("visitor_logs")
      .select("*")
      .eq("unit_id", unitId)
      .order("created_at", { ascending: false })

    if (profile.role !== "property_manager" && profile.role !== "admin") {
      query = query.eq("host_id", profile.id)
    }

    const { data: logs, error } = await query

    if (error) {
      return jsonError("DATA_FETCH_FAILED", { message: error.message })
    }

    const hostIds = Array.from(new Set((logs ?? []).map((log) => log.host_id)))
    const roommateIds = Array.from(
      new Set((logs ?? []).map((log) => log.host_roommate_id).filter(Boolean))
    ) as string[]
    const actorIds = Array.from(new Set(hostIds.concat(roommateIds)))

    const { data: people } = actorIds.length
      ? await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", actorIds)
      : { data: [] }

    const personById = new Map((people ?? []).map((person) => [person.id, person]))

    const decorated = (logs ?? []).map((log) => ({
      ...log,
      host_name:
        personById.get(log.host_id)?.full_name ?? personById.get(log.host_id)?.email ?? "Unknown",
      host_roommate_name: log.host_roommate_id
        ? personById.get(log.host_roommate_id)?.full_name ??
          personById.get(log.host_roommate_id)?.email ??
          "Unknown"
        : "",
    }))

    if (format === "csv") {
      if (profile.role !== "property_manager" && profile.role !== "admin") {
        return jsonError("AUTH_UNAUTHORIZED", { message: "Forbidden" })
      }

      const csv = createVisitorLogCsv(
        decorated.map((entry) => ({
          guestName: entry.guest_name,
          hostName: entry.host_name,
          hostRoommateName: entry.host_roommate_name,
          arrivalDate: entry.check_in_date,
          departureDate: entry.check_out_date,
          reason: entry.reason,
          status: entry.status,
          requiresApproval: Boolean(entry.requires_manager_approval),
          approvedAt: entry.approved_at ?? "",
          createdAt: entry.created_at ?? "",
        }))
      )

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="visitor-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    if (!includeAudit) {
      return NextResponse.json({ data: decorated })
    }

    const visitorIds = decorated.map((entry) => entry.id)
    const { data: auditRows } = visitorIds.length
      ? await (supabase as any)
          .from("visitor_log_audit_entries")
          .select("*")
          .in("visitor_log_id", visitorIds)
          .order("created_at", { ascending: false })
      : { data: [] }

    return NextResponse.json({ data: decorated, audit: auditRows ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    if (message === "AUTH_UNAUTHORIZED") return jsonError("AUTH_UNAUTHORIZED")
    if (message === "PROFILE_NOT_FOUND") {
      return jsonError("DATA_FETCH_FAILED", { message: "Unable to load profile" })
    }
    return jsonError("DATA_FETCH_FAILED", { message })
  }
}

export async function POST(request: Request) {
  const supabase = createClient(cookies()) as SupabaseClient<Database>

  try {
    const payload = createVisitorSchema.parse(await request.json())
    const { user, profile } = await loadViewerProfile(supabase)
    const unitId = profile.unit_id as string

    const policy = await loadPolicy(supabase, unitId)

    const { data: activeEntries } = await supabase
      .from("visitor_logs")
      .select("check_in_date, check_out_date, status")
      .eq("unit_id", unitId)
      .in("status", ["pending", "approved"])

    const evaluation = evaluateVisitorPolicy(policy, {
      checkInDate: new Date(payload.arrivalDate),
      checkOutDate: new Date(payload.departureDate),
      currentUnitActiveStays: (activeEntries ?? []) as any,
    })

    if (!evaluation.allowed) {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "Visitor request violates policy",
        details: { violations: evaluation.violations },
      })
    }

    const status = policy.requiresManagerApproval ? "pending" : "approved"

    const { data: created, error: insertError } = await (supabase as any)
      .from("visitor_logs")
      .insert({
        guest_name: payload.guestName,
        guest_email: payload.guestEmail,
        guest_phone: payload.guestPhone,
        host_id: user.id,
        host_roommate_id: payload.hostRoommateId,
        unit_id: unitId,
        check_in_date: payload.arrivalDate,
        check_out_date: payload.departureDate,
        reason: payload.reason,
        purpose: payload.reason,
        emergency_contact: payload.emergencyContact,
        special_notes: payload.specialNotes,
        requires_manager_approval: policy.requiresManagerApproval,
        policy_snapshot: policy,
        policy_violations: evaluation.violations,
        consecutive_nights: evaluation.consecutiveNights,
        status,
        approval_status: status === "approved" ? "approved" : "pending",
      })
      .select("*")
      .single()

    if (insertError) {
      return jsonError("DATA_FETCH_FAILED", { message: insertError.message })
    }

    await (supabase as any).from("visitor_log_audit_entries").insert({
      visitor_log_id: created.id,
      actor_id: user.id,
      action: "submitted",
      notes: "Visitor request submitted",
      metadata: { status },
    })

    const { data: unitMembers } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("unit_id", unitId)
      .neq("id", user.id)

    const notifications = (unitMembers ?? []).flatMap((member) => {
      if (!member.email) return []
      const isManager = member.role === "property_manager" || member.role === "admin"
      return [
        {
          to: member.email,
          subject: `Visitor request: ${payload.guestName}`,
          template: "visitor-booking",
          data: {
            guestName: payload.guestName,
            hostName: profile.full_name ?? profile.email ?? "Unknown",
            checkInDate: payload.arrivalDate,
            checkOutDate: payload.departureDate,
            purpose: payload.reason,
          },
          userId: member.id,
        },
        {
          userId: member.id,
          title: isManager ? "Visitor approval required" : "New visitor submission",
          message: `${payload.guestName} requested from ${new Date(payload.arrivalDate).toLocaleDateString()} to ${new Date(payload.departureDate).toLocaleDateString()}.`,
          type: isManager ? ("warning" as const) : ("info" as const),
          actionUrl: "/visitors",
          metadata: { visitorLogId: created.id, status },
        },
      ]
    })

    if (notifications.length > 0) {
      await sendBulkNotifications(notifications)
    }

    return NextResponse.json({ data: created })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "Invalid payload",
        details: error.flatten(),
      })
    }

    return jsonError("DATA_FETCH_FAILED", {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
