"use client";

import { useCallback } from "react";

import { useToast } from "@/components/ui/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { OfflineMutationConflictError, OfflineMutationRetryableError } from "@/lib/offline/errors";
import type { OfflineQueueEvent } from "@/lib/offline/mutate-offline";
import { createClient } from "@/utils/supabase-browser";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";
import { fetchMemberProfile, fetchMembersByUnit } from "@/lib/data/members";

export const MAINTENANCE_MUTATION_KEY = "maintenance-request";

export type MaintenanceRequestPayload = {
  title: string;
  description: string;
  priority: "low" | "normal" | "high" | "urgent";
  category?: string | null;
  location?: string | null;
};

export interface MaintenanceMutationPayload {
  request: MaintenanceRequestPayload;
}

function isConflictError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : undefined;
  const status = typeof record.status === "number" ? record.status : undefined;
  const message = typeof record.message === "string" ? record.message.toLowerCase() : "";

  return status === 409 || code === "23505" || message.includes("duplicate key");
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
    if (typeof record.status === "number" && record.status === 0) {
      return true;
    }
  }

  return false;
}

export function useMaintenanceMutation() {
  const { toast } = useToast();
  const { notifyMaintenanceRequest } = useNotifications();

  const handler = useCallback(
    async ({ request }: MaintenanceMutationPayload) => {
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
        if (!profile) {
          throw new Error("Profile not found");
        }

        if (!profile.unit_id) {
          throw new Error("User is not assigned to a unit");
        }

        const [propertyManager] = await fetchMembersByUnit(typedSupabase, profile.unit_id, {
          roles: ["property_manager"],
        });

        if (!propertyManager) {
          throw new Error("Property manager not found for this unit");
        }

        const { data: requestRow, error: requestError } = await (supabase as any)
          .from("maintenance_requests")
          .insert({
            title: request.title,
            description: request.description,
            priority: request.priority,
            category: request.category || null,
            location: request.location || null,
            requested_by: user.id,
            unit_id: profile.unit_id,
            status: "pending",
          })
          .select()
          .single();

        if (requestError) {
          if (isConflictError(requestError)) {
            throw new OfflineMutationConflictError("Maintenance request already exists", {
              code: (requestError as Record<string, unknown>).code,
              message: (requestError as Record<string, unknown>).message,
            });
          }

          if (isLikelyNetworkError(requestError)) {
            throw new OfflineMutationRetryableError("Network error while creating maintenance request", requestError);
          }

          throw requestError;
        }

        try {
          await notifyMaintenanceRequest({
            requesterName: profile.full_name || user.email || "Unknown",
            title: request.title,
            description: request.description,
            priority: request.priority,
            propertyManager: {
              id: propertyManager.id,
              email: propertyManager.email || "",
              name: propertyManager.full_name || propertyManager.email || "Unknown",
            },
          });
        } catch (notificationError) {
          console.warn("Failed to dispatch maintenance notification", notificationError);
        }

        return requestRow as Record<string, unknown>;
      } catch (error) {
        if (isLikelyNetworkError(error)) {
          throw new OfflineMutationRetryableError("Network error while submitting maintenance request", error);
        }

        throw error;
      }
    },
    [notifyMaintenanceRequest]
  );

  const onEvent = useCallback(
    (event: OfflineQueueEvent) => {
      if (event.type === "synced") {
        toast({
          title: "Queued maintenance request submitted",
          description: "We sent your maintenance request once you reconnected.",
        });
      } else if (event.type === "failed") {
        toast({
          title: "Maintenance sync failed",
          description: "We will retry your maintenance request shortly.",
          variant: "destructive",
        });
      } else if (event.type === "conflict") {
        toast({
          title: "Maintenance request conflict",
          description: "A similar maintenance request was already logged.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const mutation = useOfflineMutation<MaintenanceMutationPayload, Record<string, unknown>>({
    key: MAINTENANCE_MUTATION_KEY,
    handler,
    shouldQueueOnError: (error) => isLikelyNetworkError(error),
    onEvent,
  });

  return mutation;
}
