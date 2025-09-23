"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { ConflictDetails, evaluateConflict, extractChangedFields } from "@/lib/conflicts";
import { fetchMemberRole } from "@/lib/data/members";
import { createClient } from "@/utils/supa-server-actions";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";

interface ActionResult<T = any, TConflict = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: "conflict";
  conflict?: TConflict;
}

type MaintenanceSnapshot = {
  id: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  notes: string | null;
  assigned_to: string | null;
  updated_at: string | null;
  version: number | null;
};

type MaintenanceConflictPayload = ConflictDetails<
  MaintenanceSnapshot,
  Partial<Pick<MaintenanceSnapshot, "status" | "priority" | "notes" | "assigned_to">>
>;

const maintenanceUpdateSchema = z.object({
  requestId: z.string().uuid(),
  updates: z.object({
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    notes: z.string().optional().nullable(),
    assigned_to: z.string().uuid().optional().nullable(),
  }),
  expectedVersion: z.number().int().nonnegative().nullable().optional(),
  expectedUpdatedAt: z.string().datetime().nullable().optional(),
  resolution: z
    .object({
      type: z.enum(["keep_mine", "keep_theirs", "manual"]),
      mergedFields: z.record(z.any()).optional(),
      baseVersion: z.number().int().nonnegative().nullable().optional(),
    })
    .optional(),
});

type MaintenanceUpdatePayload = z.infer<typeof maintenanceUpdateSchema>;

type MaintenanceUpdateRecord = MaintenanceSnapshot & {
  unit_id: string | null;
  requested_by: string;
};

type MaintenanceRequest = MaintenanceSnapshot & {
  title: string;
  description: string;
  created_at: string;
};

export async function updateMaintenanceRequestAction(
  payload: MaintenanceUpdatePayload
): Promise<ActionResult<MaintenanceRequest, MaintenanceConflictPayload>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const typedSupabase = supabase as unknown as TypedSupabaseClient;

  try {
    const parsed = maintenanceUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      const firstError = flattened.fieldErrors?.[Object.keys(flattened.fieldErrors)[0]]?.[0];
      return { success: false, error: firstError || "Invalid maintenance request update." };
    }

    const { requestId, updates, expectedVersion, expectedUpdatedAt, resolution } = parsed.data;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in to update maintenance requests." };
    }

    const { data: maintenance, error: maintenanceError } = await (supabase as any)
      .from("maintenance_requests")
      .select(
        "id, status, priority, notes, assigned_to, updated_at, version, unit_id, requested_by, title, description, created_at"
      )
      .eq("id", requestId)
      .single<MaintenanceUpdateRecord & MaintenanceRequest>();

    if (maintenanceError || !maintenance) {
      console.error("Maintenance request not found", maintenanceError);
      return { success: false, error: "Maintenance request not found." };
    }

    let role: Awaited<ReturnType<typeof fetchMemberRole>> | null = null;
    try {
      role = await fetchMemberRole(typedSupabase, user.id);
    } catch (roleError) {
      console.warn("Unable to resolve role when updating maintenance request:", roleError);
    }

    const canEdit = role === "property_manager" || role === "admin";

    if (!canEdit) {
      return { success: false, error: "You do not have permission to modify this maintenance request." };
    }

    const conflictCheck = evaluateConflict({
      current: maintenance,
      incoming: updates,
      expectedVersion: expectedVersion ?? undefined,
      expectedUpdatedAt: expectedUpdatedAt ?? undefined,
      message: "This maintenance request was updated by someone else while you were editing.",
    });

    if (conflictCheck.hasConflict) {
      return {
        success: false,
        status: "conflict",
        error: conflictCheck.details.message,
        conflict: conflictCheck.details,
      };
    }

    const sanitizedUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      if (key === "notes" && value === "") {
        sanitizedUpdates.notes = null;
        continue;
      }
      sanitizedUpdates[key] = value;
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return {
        success: true,
        data: maintenance,
        message: "No changes detected.",
      };
    }

    const nextVersion = (maintenance.version ?? 1) + 1;

    const { data: updated, error: updateError } = await (supabase as any)
      .from("maintenance_requests")
      .update({
        ...sanitizedUpdates,
        version: nextVersion,
      })
      .eq("id", requestId)
      .select(
        "id, status, priority, notes, assigned_to, updated_at, version, title, description, created_at"
      )
      .single<MaintenanceRequest>();

    if (updateError || !updated) {
      console.error("Failed to update maintenance request", updateError);
      return { success: false, error: "Failed to update maintenance request." };
    }

    if (resolution) {
      const mergedFields = resolution.mergedFields ?? extractChangedFields(sanitizedUpdates, maintenance as any);
      try {
        await supabase.rpc("log_conflict_resolution", {
          p_entity_type: "maintenance_request",
          p_entity_id: requestId,
          p_resolution: resolution.type,
          p_local_version: resolution.baseVersion ?? expectedVersion ?? null,
          p_remote_version: maintenance.version ?? null,
          p_merged_fields: mergedFields,
        });
      } catch (logError) {
        console.warn("Failed to log maintenance conflict resolution:", logError);
      }
    }

    revalidatePath("/maintenance");

    return {
      success: true,
      data: updated,
      message: "Maintenance request updated successfully.",
    };
  } catch (error) {
    console.error("Unexpected error in updateMaintenanceRequestAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}
