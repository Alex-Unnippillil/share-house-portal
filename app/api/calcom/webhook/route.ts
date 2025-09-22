import { NextRequest, NextResponse } from "next/server"

import { buildBookingRecord, parseCalcomWebhookPayload } from "@/lib/calcom"
import { upsertBooking } from "@/lib/bookings"
import { createServiceRoleClient } from "@/utils/supabase/service-role"

export async function POST(request: NextRequest) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsed = parseCalcomWebhookPayload(payload)
  if (!parsed) {
    return NextResponse.json({ message: "No booking payload found" }, { status: 202 })
  }

  const client = createServiceRoleClient()
  if (!client) {
    return NextResponse.json(
      { error: "Supabase service role credentials are not configured" },
      { status: 500 }
    )
  }

  const record = buildBookingRecord(parsed)

  const { data, error } = await upsertBooking(client, record)

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Failed to persist booking record" },
      { status: 500 }
    )
  }

  return NextResponse.json({ data }, { status: 200 })
}
