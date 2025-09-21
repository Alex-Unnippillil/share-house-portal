import { redirect } from "next/navigation";
import { createSupbaseServerClient } from "@/utils/supaone";
import AmenitiesClient from "./AmenitiesClient";
import type { Database } from "@/lib/supabase";

export default async function AmenitiesPage() {
  const supabase = await createSupbaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const {
    data: amenityRows,
    error: amenitiesError,
  } = await supabase.from("amenities").select("*").order("name", { ascending: true });

  if (amenitiesError) {
    console.error("Failed to load amenities", amenitiesError);
  }

  const { data: bookingRows } = await supabase
    .from("amenity_bookings")
    .select("id,start_time,end_time,status,calcom_event_id,amenity:amenity_id(id,name,slug)")
    .eq("user_id", user.id)
    .order("start_time", { ascending: true });

  const amenities: Database["public"]["Tables"]["amenities"]["Row"][] = amenityRows ?? [];

  const bookings = (bookingRows ?? []).map((booking) => ({
    id: booking.id,
    start_time: booking.start_time,
    end_time: booking.end_time,
    status: booking.status,
    calcom_event_id: booking.calcom_event_id,
    amenity: booking.amenity ?? null,
  }));

  const userName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.length > 0
      ? user.user_metadata.full_name
      : undefined) ?? user.email ?? "";

  return (
    <AmenitiesClient
      amenities={amenities}
      bookings={bookings}
      userEmail={user.email ?? ""}
      userName={userName}
      calOrigin={process.env.NEXT_PUBLIC_CALCOM_EMBED_URL ?? "https://cal.com"}
    />
  );
}
