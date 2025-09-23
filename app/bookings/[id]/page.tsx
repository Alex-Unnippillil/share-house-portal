import Link from "next/link";

import ActivityFeed from "@/components/activity/ActivityFeed";
import { Separator } from "@/components/ui/separator";

interface BookingDetailPageProps {
  params: { id: string };
}

export default function BookingDetailPage({ params }: BookingDetailPageProps) {
  const bookingId = params.id;

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <div className="space-y-2">
        <Link
          href="/bookings"
          className="text-sm text-muted-foreground transition hover:text-primary"
        >
          ← Back to bookings
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Booking activity</h1>
          <p className="text-sm text-muted-foreground">
            Updates for amenity booking {bookingId}, including notes and schedule changes.
          </p>
        </div>
      </div>

      <Separator />

      <ActivityFeed entityId={bookingId} entityType="booking" />
    </div>
  );
}
