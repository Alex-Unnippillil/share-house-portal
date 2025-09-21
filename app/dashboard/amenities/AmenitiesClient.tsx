"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cal, { getCalApi, type EmbedEvent } from "@calcom/embed-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import type { Database } from "@/lib/supabase";
import type { BookingStatus } from "@/lib/amenity-bookings";

interface AmenitiesClientProps {
  amenities: Database["public"]["Tables"]["amenities"]["Row"][];
  bookings: BookingListItem[];
  userEmail: string;
  userName: string;
  calOrigin: string;
}

type Amenity = Database["public"]["Tables"]["amenities"]["Row"];

interface BookingListItem {
  id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus | string;
  calcom_event_id: string;
  amenity: Pick<Amenity, "id" | "name" | "slug"> | null;
}

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
  conflict: "destructive",
};

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "Scheduled";
  }

  const sameDay = startDate.toDateString() === endDate.toDateString();
  if (sameDay) {
    return `${format(startDate, "PPP p")} – ${format(endDate, "p")}`;
  }

  return `${format(startDate, "PPP p")} – ${format(endDate, "PPP p")}`;
}

function normaliseStatus(status: string): string {
  const value = status.toLowerCase();
  if (value === "confirmed" || value === "pending" || value === "cancelled" || value === "conflict") {
    return value;
  }
  return "pending";
}

export default function AmenitiesClient({ amenities, bookings: initialBookings, userEmail, userName, calOrigin }: AmenitiesClientProps) {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingListItem[]>(() => initialBookings);
  const [openAmenityId, setOpenAmenityId] = useState<string | null>(null);
  const activeAmenityRef = useRef<Amenity | null>(null);

  const sortedAmenities = useMemo(() => {
    return [...amenities].sort((a, b) => a.name.localeCompare(b.name));
  }, [amenities]);

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        if (!booking.start_time) {
          return false;
        }
        const start = new Date(booking.start_time);
        if (Number.isNaN(start.getTime())) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [bookings]);

  const updateBookingList = useCallback((record: BookingListItem) => {
    setBookings((previous) => {
      const withoutCurrent = previous.filter((booking) => booking.id !== record.id);
      return [...withoutCurrent, record].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    });
  }, []);

  const handleDialogChange = useCallback(
    (amenity: Amenity) =>
      (open: boolean) => {
        setOpenAmenityId(open ? amenity.id : null);
        activeAmenityRef.current = open ? amenity : null;
      },
    [],
  );

  useEffect(() => {
    let cleanup = false;
    let calInstance: Awaited<ReturnType<typeof getCalApi>> | null = null;

    const handleBooking = async (event: EmbedEvent<"bookingSuccessfulV2">) => {
      if (!activeAmenityRef.current) {
        return;
      }

      const amenity = activeAmenityRef.current;
      const eventData = event.detail.data;
      const eventId = eventData.uid ?? eventData.id;

      if (!eventId) {
        return;
      }

      try {
        const response = await fetch("/api/amenities/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amenityId: amenity.id,
            eventId,
            eventTypeId: eventData.eventTypeId ?? null,
            startTime: eventData.startTime ?? null,
            endTime: eventData.endTime ?? null,
          }),
        });

        if (response.status === 409) {
          const payload = await response.json().catch(() => ({ message: "This time is already booked." }));
          toast({
            title: `Time unavailable for ${amenity.name}`,
            description: typeof payload.error === "string" ? payload.error : payload.message ?? "Please choose another time slot.",
            variant: "destructive",
          });
          return;
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          toast({
            title: "Unable to log booking",
            description: typeof payload.error === "string" ? payload.error : "Please try again in a moment.",
            variant: "destructive",
          });
          return;
        }

        const payload = (await response.json()) as { data: BookingListItem };
        if (payload?.data) {
          updateBookingList({
            ...payload.data,
            status: normaliseStatus(String(payload.data.status ?? "confirmed")),
            amenity: amenity ? { id: amenity.id, name: amenity.name, slug: amenity.slug } : null,
          });

          toast({
            title: `${amenity.name} booked`,
            description: formatDateRange(payload.data.start_time, payload.data.end_time),
          });
        }

        setOpenAmenityId(null);
        activeAmenityRef.current = null;
      } catch (error) {
        console.error("Failed to persist amenity booking", error);
        toast({
          title: "Unable to save booking",
          description: "Please check your connection and try again.",
          variant: "destructive",
        });
      }
    };

    const handleCancellation = (event: EmbedEvent<"bookingCancelled">) => {
      const amenity = activeAmenityRef.current;
      if (!amenity) {
        return;
      }

      const bookingPayload = event.detail.data?.booking as { uid?: string; id?: string } | undefined;
      const eventId = bookingPayload?.uid ?? bookingPayload?.id;

      if (!eventId) {
        return;
      }

      toast({
        title: `${amenity.name} booking not completed`,
        description: "The booking was cancelled before confirmation.",
      });
      setOpenAmenityId(null);
      activeAmenityRef.current = null;
    };

    (async () => {
      calInstance = await getCalApi();
      if (cleanup) {
        return;
      }

      calInstance("ui", {
        theme: "auto",
      });

      calInstance("on", {
        action: "bookingSuccessfulV2",
        callback: handleBooking,
      });

      calInstance("on", {
        action: "bookingCancelled",
        callback: handleCancellation,
      });
    })();

    return () => {
      cleanup = true;
      if (calInstance) {
        calInstance("off", { action: "bookingSuccessfulV2", callback: handleBooking });
        calInstance("off", { action: "bookingCancelled", callback: handleCancellation });
      }
    };
  }, [toast, updateBookingList]);

  return (
    <div className="space-y-8">
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Shared Amenities</CardTitle>
            <CardDescription>Reserve kitchen time, entertainment gear, parking, and more without double-booking roommates.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedAmenities.map((amenity) => (
                <AmenityCard
                  key={amenity.id}
                  amenity={amenity}
                  open={openAmenityId === amenity.id}
                  onOpenChange={handleDialogChange(amenity)}
                  calOrigin={calOrigin}
                  userEmail={userEmail}
                  userName={userName}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Your Upcoming Reservations</CardTitle>
            <CardDescription>Track scheduled slots across all amenities.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings yet. Reserve an amenity to see it listed here.</p>
            ) : (
              <ScrollArea className="max-h-80">
                <ul className="space-y-3 pr-4">
                  {upcomingBookings.map((booking) => {
                    const bookingAmenity = booking.amenity;
                    const status = normaliseStatus(String(booking.status));
                    return (
                      <li key={booking.id} className="flex items-start justify-between rounded-lg border p-4">
                        <div>
                          <p className="text-sm font-semibold">
                            {bookingAmenity?.name ?? "Amenity"}
                          </p>
                          <p className="text-sm text-muted-foreground">{formatDateRange(booking.start_time, booking.end_time)}</p>
                        </div>
                        <Badge variant={statusVariantMap[status] ?? "outline"}>{status}</Badge>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

interface AmenityCardProps {
  amenity: Amenity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calOrigin: string;
  userEmail: string;
  userName: string;
}

function AmenityCard({ amenity, open, onOpenChange, calOrigin, userEmail, userName }: AmenityCardProps) {
  const cardDescription = amenity.description?.length ? amenity.description : `Reserve shared access to the ${amenity.name}.`;
  const hostSegment = (amenity.calcom_host ?? amenity.slug ?? "").replace(/^\/+/, "").replace(/\/+$/, "");
  const slugSegment = (amenity.calcom_event_slug ?? amenity.slug ?? "").replace(/^\/+/, "");
  const calLink = [hostSegment, slugSegment].filter(Boolean).join("/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Card className="flex h-full flex-col justify-between">
        <CardHeader>
          <CardTitle>{amenity.name}</CardTitle>
          <CardDescription>{cardDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2">
          <Badge variant="outline">No double-booking</Badge>
          <DialogTrigger asChild>
            <Button>Book</Button>
          </DialogTrigger>
        </CardContent>
      </Card>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Book the {amenity.name}</DialogTitle>
          <DialogDescription>
            Select an open slot to confirm your reservation. Once confirmed, it will appear in your dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="h-[640px] w-full">
          {open ? (
            <Cal
              key={amenity.id}
              namespace={`amenity-${amenity.id}`}
              calOrigin={calOrigin}
              calLink={calLink}
              config={{
                name: userName,
                email: userEmail,
              }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
