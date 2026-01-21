"use client";

import { useCallback } from "react";

import { toast } from "sonner";

import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { OfflineMutationConflictError, OfflineMutationRetryableError } from "@/lib/offline/errors";
import type { OfflineQueueEvent } from "@/lib/offline/mutate-offline";
import { createAmenityBooking } from "@/lib/calcom-service";
import { fetchMemberProfile } from "@/lib/data/members";
import { createClient } from "@/utils/supabase-browser";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";

export const BOOKING_MUTATION_KEY = "amenity-booking";

export interface BookingMutationPayload {
  amenityId: string;
  amenityName: string;
  start: string;
  end: string;
  description?: string | null;
}

interface BookingResult {
  bookingId?: string;
  bookingUrl?: string;
}

function isLikelyNetworkError(error: unknown) {
  if (!error) {
    return false;
  }

  if (error instanceof OfflineMutationRetryableError) {
    return true;
  }

  if (error instanceof TypeError && typeof error.message === "string") {
    return error.message.toLowerCase().includes("fetch");
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message.toLowerCase() : "";
    if (message.includes("network") || message.includes("fetch")) {
      return true;
    }
  }

  if (typeof error === "string") {
    return error.toLowerCase().includes("fetch");
  }

  return false;
}

function isConflictMessage(message: string) {
  const normalised = message.toLowerCase();
  return (
    normalised.includes("conflict") ||
    normalised.includes("overlap") ||
    normalised.includes("already") ||
    normalised.includes("booked") ||
    normalised.includes("duplicate")
  );
}

export function useBookingMutation() {
  const handler = useCallback(async (payload: BookingMutationPayload) => {
    const supabase = createClient();
    const typedSupabase = supabase as unknown as TypedSupabaseClient;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      const profile = await fetchMemberProfile(typedSupabase, user.id);
      const userName = profile?.full_name || user.user_metadata?.full_name || user.email || "Unknown";
      const userEmail = user.email || profile?.email || "";

      const response = await createAmenityBooking({
        amenityType: payload.amenityName,
        startTime: payload.start,
        endTime: payload.end,
        userEmail,
        userName,
        description: payload.description || undefined,
      });

      if (!response.success) {
        const errorMessage = response.error || "Failed to create booking";
        if (isConflictMessage(errorMessage)) {
          throw new OfflineMutationConflictError(errorMessage);
        }
        if (isLikelyNetworkError(errorMessage)) {
          throw new OfflineMutationRetryableError("Network error while creating booking", errorMessage);
        }
        throw new Error(errorMessage);
      }

      return {
        bookingId: response.bookingId,
        bookingUrl: response.bookingUrl,
      } satisfies BookingResult;
    } catch (error) {
      if (isLikelyNetworkError(error)) {
        throw new OfflineMutationRetryableError("Network error while creating booking", error);
      }
      throw error;
    }
  }, []);

  const onEvent = useCallback((event: OfflineQueueEvent) => {
    if (event.type === "synced") {
      toast.success("Queued booking confirmed", {
        description: "Your amenity booking has been submitted.",
      });
    } else if (event.type === "failed") {
      toast.error("Unable to sync booking", {
        description: "We'll keep retrying your amenity booking.",
      });
    } else if (event.type === "conflict") {
      toast.error("Booking conflict detected", {
        description: "The selected slot was taken before we could confirm it.",
      });
    }
  }, []);

  return useOfflineMutation<BookingMutationPayload, BookingResult>({
    key: BOOKING_MUTATION_KEY,
    handler,
    shouldQueueOnError: (error) => isLikelyNetworkError(error),
    onEvent,
  });
}
