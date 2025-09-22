import { NextRequest, NextResponse } from "next/server"

import { buildBookingRecord, normalizeCalcomBookingPayload } from "@/lib/calcom"
import { upsertBooking } from "@/lib/bookings"
import { createServiceRoleClient } from "@/utils/supabase/service-role"

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const booking = normalizeCalcomBookingPayload(body)
  if (!booking) {
    return NextResponse.json({ error: "Booking details are missing required fields" }, { status: 400 })
  }

  const triggerEvent =
    typeof body === "object" &&
    body !== null &&
    "triggerEvent" in body &&
    typeof (body as Record<string, unknown>).triggerEvent === "string"
      ? (body as Record<string, string>).triggerEvent
      : undefined

  const client = createServiceRoleClient()
  if (!client) {
    return NextResponse.json(
      { error: "Supabase service role credentials are not configured" },
      { status: 500 }
    )
  }

  const record = buildBookingRecord({ booking, triggerEvent })

  const { data, error } = await upsertBooking(client, record)

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Failed to persist booking record" },
      { status: 500 }
    )
  }

  return NextResponse.json({ data }, { status: 201 })
}
