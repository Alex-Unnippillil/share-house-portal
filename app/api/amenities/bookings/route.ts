import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { z } from "zod";
import { fetchCalBooking } from "@/lib/calcom";
import {
  ACTIVE_BOOKING_STATUSES,
  type BookingTimeSpan,
  hasBookingConflict,
} from "@/lib/amenity-bookings";
import type { Database } from "@/lib/supabase";

const requestSchema = z.object({
  amenityId: z.string().uuid(),
  eventId: z.string().min(1),
  eventTypeId: z.union([z.string(), z.number()]).optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { amenityId, eventId } = parsed.data;
  let { startTime, endTime } = parsed.data;

  const amenityResult = await supabase
    .from("amenities")
    .select("id,building_id,unit_id,calcom_event_type_id")
    .eq("id", amenityId)
    .maybeSingle();

  if (amenityResult.error || !amenityResult.data) {
    return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
  }

  const amenity = amenityResult.data;

  if (!startTime || !endTime) {
    try {
      const calEvent = await fetchCalBooking(eventId);
      startTime = startTime ?? calEvent?.startTime ?? undefined;
      endTime = endTime ?? calEvent?.endTime ?? undefined;
    } catch (error) {
      console.error("Failed to fetch booking details from Cal.com", error);
    }
  }

  if (!startTime || !endTime) {
    return NextResponse.json(
      { error: "Unable to determine booking time from Cal.com." },
      { status: 422 },
    );
  }

  const existing = await supabase
    .from("amenity_bookings")
    .select("id,start_time,end_time,status")
    .eq("amenity_id", amenityId)
    .neq("calcom_event_id", eventId)
    .in("status", ACTIVE_BOOKING_STATUSES);

  if (existing.error) {
    console.error("Failed to load existing bookings", existing.error);
    return NextResponse.json({ error: "Unable to validate availability." }, { status: 500 });
  }

  if (existing.data && hasBookingConflict(existing.data as BookingTimeSpan[], startTime, endTime)) {
    return NextResponse.json(
      { error: "The selected time is no longer available." },
      { status: 409 },
    );
  }

  const insertResult = await supabase
    .from("amenity_bookings")
    .insert({
      amenity_id: amenityId,
      user_id: user.id,
      calcom_event_id: eventId,
      start_time: startTime,
      end_time: endTime,
      status: "confirmed",
      building_id: amenity.building_id,
      unit_id: amenity.unit_id,
    })
    .select("id,start_time,end_time,status,calcom_event_id,amenity:amenity_id(id,name,slug)")
    .single();

  if (insertResult.error || !insertResult.data) {
    const code = insertResult.error?.code;
    if (code === "23505") {
      return NextResponse.json({ error: "This slot has already been reserved." }, { status: 409 });
    }

    if (insertResult.error?.message?.includes("amenity_bookings_no_overlap")) {
      return NextResponse.json({ error: "This slot has already been reserved." }, { status: 409 });
    }

    console.error("Failed to insert amenity booking", insertResult.error);
    return NextResponse.json({ error: "Could not save booking." }, { status: 500 });
  }

  return NextResponse.json({ data: insertResult.data }, { status: 201 });
}
