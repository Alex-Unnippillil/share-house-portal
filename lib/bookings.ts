import type { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js"

import type { BookingInsert, BookingRow } from "@/lib/calcom"
import type { Database } from "@/lib/supabase"

const CONFLICT_COLUMN = "calcom_booking_id"

export async function upsertBooking(
  client: SupabaseClient<Database>,
  record: BookingInsert
): Promise<PostgrestSingleResponse<BookingRow>> {
  const response = await client
    .from("bookings")
    .upsert(record, { onConflict: CONFLICT_COLUMN })
    .select()
    .maybeSingle()

  if (response.error && response.error.code === "42703") {
    return client.from("bookings").insert(record).select().maybeSingle()
  }

  return response
}
