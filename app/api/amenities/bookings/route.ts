import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { z } from "zod"

import type { Database } from "@/lib/supabase"
import {
  mapBookingInsert,
  isSupabaseConflictError,
  type CalBookingPayload,
} from "@/lib/amenities/bookings"

const requestSchema = z.object({
  amenityId: z.string().uuid(),
  booking: z.object({
    uid: z.string(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    eventTypeId: z.number(),
    status: z.string().optional(),
  }) satisfies z.ZodType<CalBookingPayload>,
})

const querySchema = z.object({
  amenityId: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to view your bookings." },
      { status: 401 }
    )
  }

  const url = new URL(request.url)
  const search = Object.fromEntries(url.searchParams)
  const parsed = querySchema.safeParse({
    amenityId: search.amenityId,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  let query = supabase
    .from("amenity_bookings")
    .select("id, amenity_id, tenant_id, start_time, end_time, status, notes")
    .eq("tenant_id", user.id)

  if (parsed.data.amenityId) {
    query = query.eq("amenity_id", parsed.data.amenityId)
  }

  const { data, error } = await query
    .order("start_time", { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: "Unable to load bookings" }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to book amenities." }, { status: 401 })
  }

  const raw = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(raw)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid booking payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { amenityId, booking } = parsed.data

  const { data: amenity, error: amenityError } = await supabase
    .from("amenities")
    .select(
      "id, name, slug, description, building_id, unit_id, calcom_event_slug, calcom_event_type_id, created_at, updated_at"
    )
    .eq("id", amenityId)
    .maybeSingle()

  if (amenityError) {
    return NextResponse.json({ error: "Unable to load amenity" }, { status: 500 })
  }

  if (!amenity) {
    return NextResponse.json({ error: "Amenity not found" }, { status: 404 })
  }

  try {
    const payload = mapBookingInsert({
      amenity,
      booking,
      tenantId: user.id,
    })

    const { data: inserted, error } = await supabase
      .from("amenity_bookings")
      .insert(payload)
      .select()
      .maybeSingle()

    if (error) {
      if (isSupabaseConflictError(error)) {
        return NextResponse.json(
          { error: "This amenity is already booked for the selected time." },
          { status: 409 }
        )
      }

      throw error
    }

    return NextResponse.json({ data: inserted })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "We couldn't save your booking. Please try again."
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
