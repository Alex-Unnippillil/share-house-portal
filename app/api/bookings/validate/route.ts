import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { amenityCatalog } from "@/lib/bookings/amenity-catalog"
import { validateBookingPolicy } from "@/lib/bookings/policy"
import { incrementOperationalMetric } from "@/lib/observability/metrics"
import { createClient } from "@/utils/supa-server-actions"

interface ValidateRequestBody {
  amenityId?: string
  startTime?: string
  endTime?: string
  recurrence?: {
    enabled?: boolean
    frequency?: "daily" | "weekly"
    count?: number
  }
  excludeBookingId?: string
}

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  let body: ValidateRequestBody
  try {
    body = (await request.json()) as ValidateRequestBody
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" },
      { status: 400 },
    )
  }

  const amenity = amenityCatalog.find((item) => item.id === body.amenityId)
  if (!amenity || !body.startTime || !body.endTime) {
    return NextResponse.json(
      { ok: false, message: "amenityId, startTime, and endTime are required" },
      { status: 400 },
    )
  }

  const policyResult = validateBookingPolicy({
    amenity,
    startTime: body.startTime,
    endTime: body.endTime,
    recurrence: {
      enabled: Boolean(body.recurrence?.enabled),
      frequency: body.recurrence?.frequency,
      count: body.recurrence?.count,
    },
  })

  if (!policyResult.allowed) {
    incrementOperationalMetric("booking_conflict_validation_rejections_total", {
      source: "booking_validation",
      provider: "supabase",
      amenityId: amenity.id,
      reason: "policy_violation",
      severity: "medium",
    })

    return NextResponse.json({
      ok: true,
      allowed: false,
      errors: policyResult.errors,
      warnings: policyResult.warnings,
      conflicts: [],
    })
  }

  const overlapQuery = supabase
    .from("bookings")
    .select("id, start_time, end_time, status")
    .eq("amenity_id", amenity.id)
    .neq("status", "cancelled")
    .lt("start_time", body.endTime)
    .gt("end_time", body.startTime)

  if (body.excludeBookingId) {
    overlapQuery.neq("id", body.excludeBookingId)
  }

  const { data, error } = await overlapQuery

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Unable to validate conflicts", details: error.message },
      { status: 500 },
    )
  }

  if (data.length > 0) {
    incrementOperationalMetric("booking_conflict_validation_rejections_total", {
      source: "booking_validation",
      provider: "supabase",
      amenityId: amenity.id,
      reason: "overlap_conflict",
      severity: "medium",
      conflictCount: data.length,
    })
  }

  return NextResponse.json({
    ok: true,
    allowed: data.length === 0,
    errors: [],
    warnings: policyResult.warnings,
    conflicts: data,
  })
}
