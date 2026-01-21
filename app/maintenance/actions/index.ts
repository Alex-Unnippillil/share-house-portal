"use server";

import { cookies } from "next/headers";

import { createClient } from "@/utils/supa-server-actions";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";
import { fetchMemberProfile } from "@/lib/data/members";
import { fetchMaintenanceRequests } from "@/lib/data/maintenance";
import type { MaintenanceRequestWithRelations } from "@/types/maintenance";

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getMaintenanceRequestsAction(): Promise<
  ActionResult<MaintenanceRequestWithRelations[]>
> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const typedSupabase = supabase as unknown as TypedSupabaseClient;

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be signed in to view maintenance requests." };
    }

    const profile = await fetchMemberProfile(typedSupabase, user.id);

    if (!profile) {
      return { success: false, error: "Unable to determine your household membership." };
    }

    const requests = await fetchMaintenanceRequests({
      client: typedSupabase,
      userId: user.id,
      unitId: profile.unit_id,
      role: profile.role,
    });

    return { success: true, data: requests };
  } catch (error) {
    console.error("Failed to load maintenance requests:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error loading maintenance requests.",
    };
  }
}
