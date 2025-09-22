"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarClock, Clock, Users } from "lucide-react";
import { toast } from "sonner";

import { RouteModal } from "@/components/route-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AmenityId } from "./amenities";

interface AmenityDetails {
  id: AmenityId;
  name: string;
  description: string;
  duration: string;
  maxAdvance: string;
}

interface AmenityBookingModalProps {
  amenity: AmenityDetails;
}

export function AmenityBookingModal({ amenity }: AmenityBookingModalProps) {
  const router = useRouter();
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("18:00");
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success(`Booked ${amenity.name} for ${format(new Date(date), 'MMM d')}`);
      router.push("/bookings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <RouteModal returnTo="/bookings" className="sm:max-w-lg">
      <form className="flex h-full flex-col" onSubmit={handleSubmit}>
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Book {amenity.name}</h2>
          <p className="text-sm text-muted-foreground">{amenity.description}</p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <CalendarClock className="size-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Default duration</p>
                <p className="text-xs text-muted-foreground">{amenity.duration}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="size-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Book up to</p>
                <p className="text-xs text-muted-foreground">{amenity.maxAdvance} in advance</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="size-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Guests included</p>
                <p className="text-xs text-muted-foreground">Add optional notes for roommates</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="booking-date">Date</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-start">Start time</Label>
                <Input
                  id="booking-start"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-count">Guests</Label>
              <Input
                id="guest-count"
                type="number"
                min={1}
                max={12}
                value={guestCount}
                onChange={(event) => setGuestCount(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-notes">Notes</Label>
              <Textarea
                id="booking-notes"
                placeholder="Share context for roommates or the property manager"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
              />
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t bg-muted/30 px-6 py-4">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Confirm booking'}
          </Button>
        </div>
      </form>
    </RouteModal>
  );
}
