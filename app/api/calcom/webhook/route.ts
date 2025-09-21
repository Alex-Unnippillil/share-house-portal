import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import {
  ACTIVE_BOOKING_STATUSES,
  buildBookingInsert,
  collectConflictingBookingIds,
  mapWebhookPayload,
  type BookingTimeSpan,
} from "@/lib/amenity-bookings";
import { fetchCalBooking } from "@/lib/calcom";
import type { Database } from "@/lib/supabase";

const WEBHOOK_SECRET = process.env.CALCOM_WEBHOOK_SECRET;

function verifySignature(signature: string | null, payload: string): boolean {
  if (!WEBHOOK_SECRET) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const signatureValue = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");

  const toBuffer = (value: string) => {
    if (/^[0-9a-f]+$/i.test(value)) {
      return Buffer.from(value, "hex");
    }
    return Buffer.from(value);
  };

  try {
    return crypto.timingSafeEqual(toBuffer(signatureValue), toBuffer(expected));
  } catch {
    return false;
  }
}

function createServiceClient(): SupabaseClient<Database> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase credentials are not configured");
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveUserId(client: SupabaseClient<Database>, email?: string | null): Promise<string | null> {
  if (!email) {
    return null;
  }

  const profile = await client.from("profiles").select("id").eq("email", email).maybeSingle();
  if (profile.error) {
    console.error("Failed to resolve user profile for webhook", profile.error);
    return null;
  }

  return profile.data?.id ?? null;
}

async function markConflicts(
  client: SupabaseClient<Database>,
  amenityId: string,
  eventId: string,
  startTime: string,
  endTime: string,
) {
  const existing = await client
    .from("amenity_bookings")
    .select("id,start_time,end_time,status")
    .eq("amenity_id", amenityId)
    .neq("calcom_event_id", eventId)
    .in("status", ACTIVE_BOOKING_STATUSES);

  if (existing.error || !existing.data) {
    return;
  }

  const conflicting = collectConflictingBookingIds(existing.data as BookingTimeSpan[], startTime, endTime);
  if (conflicting.length > 0) {
    await client.from("amenity_bookings").update({ status: "conflict" }).in("id", conflicting);
  }
}

async function ensureTimeValues(eventId: string, startTime: string | null, endTime: string | null) {
  if (startTime && endTime) {
    return { startTime, endTime };
  }

  const booking = await fetchCalBooking(eventId);
  return {
    startTime: startTime ?? booking?.startTime ?? null,
    endTime: endTime ?? booking?.endTime ?? null,
  };
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-cal-signature-256");

  if (!verifySignature(signature, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error("Failed to parse Cal.com webhook payload", error);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const event = mapWebhookPayload(payload);

  if (!event) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();

  const existingBooking = await supabase
    .from("amenity_bookings")
    .select("id,amenity_id,start_time,end_time,status,building_id,unit_id")
    .eq("calcom_event_id", event.eventId)
    .maybeSingle();

  if (existingBooking.error) {
    console.error("Failed to load booking from webhook", existingBooking.error);
  }

  let amenityContext: { id: string; building_id: string | null; unit_id: string | null } | null = null;

  if (existingBooking.data) {
    amenityContext = {
      id: existingBooking.data.amenity_id,
      building_id: existingBooking.data.building_id ?? null,
      unit_id: existingBooking.data.unit_id ?? null,
    };
  }

  if (!amenityContext && event.eventTypeId) {
    const amenityResult = await supabase
      .from("amenities")
      .select("id,building_id,unit_id")
      .eq("calcom_event_type_id", event.eventTypeId)
      .maybeSingle();

    if (!amenityResult.error && amenityResult.data) {
      amenityContext = {
        id: amenityResult.data.id,
        building_id: amenityResult.data.building_id ?? null,
        unit_id: amenityResult.data.unit_id ?? null,
      };
    }
  }

  if (!amenityContext) {
    return NextResponse.json({ received: true });
  }

  const resolvedTimes = await ensureTimeValues(event.eventId, event.startTime, event.endTime);
  const startTime = resolvedTimes.startTime;
  const endTime = resolvedTimes.endTime;

  if (startTime && endTime && event.status !== "cancelled") {
    await markConflicts(supabase, amenityContext.id, event.eventId, startTime, endTime);
  }

  if (existingBooking.data) {
    const updates: Record<string, unknown> = { status: event.status };
    if (startTime) {
      updates.start_time = startTime;
    }
    if (endTime) {
      updates.end_time = endTime;
    }

    const updateResult = await supabase
      .from("amenity_bookings")
      .update(updates)
      .eq("id", existingBooking.data.id);

    if (updateResult.error) {
      console.error("Failed to update booking from webhook", updateResult.error);
    }

    return NextResponse.json({ received: true });
  }

  if (!startTime || !endTime) {
    return NextResponse.json({ received: true });
  }

  const userId = await resolveUserId(supabase, event.attendeeEmail);

  const insertResult = await supabase
    .from("amenity_bookings")
    .upsert(
      {
        ...buildBookingInsert({
          amenityId: amenityContext.id,
          userId,
          eventId: event.eventId,
          startTime,
          endTime,
          status: event.status,
          buildingId: amenityContext.building_id,
          unitId: amenityContext.unit_id,
        }),
      },
      { onConflict: "calcom_event_id" },
    );

  if (insertResult.error) {
    console.error("Failed to mirror booking from webhook", insertResult.error);
  }

  return NextResponse.json({ received: true });
}
