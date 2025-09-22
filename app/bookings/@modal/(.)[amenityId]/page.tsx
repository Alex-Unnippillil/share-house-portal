import { Suspense } from "react";
import { notFound } from "next/navigation";

import { AmenityBookingSkeleton } from "@/app/bookings/components/amenity-booking-skeleton";
import { getAmenityById } from "@/app/bookings/components/amenities";

interface BookingModalPageProps {
  params: { amenityId: string };
  searchParams: { modal?: string };
}

async function AmenityBookingModalLoader({ amenityId }: { amenityId: string }) {
  const amenity = getAmenityById(amenityId);

  if (!amenity) {
    notFound();
  }

  const { AmenityBookingModal } = await import("@/app/bookings/components/amenity-booking-modal");

  return <AmenityBookingModal amenity={amenity} />;
}

export default function BookingModalPage({ params, searchParams }: BookingModalPageProps) {
  if (searchParams?.modal !== "book") {
    return null;
  }

  return (
    <Suspense fallback={<AmenityBookingSkeleton />}>
      {/* @ts-expect-error Async Server Component */}
      <AmenityBookingModalLoader amenityId={params.amenityId} />
    </Suspense>
  );
}
