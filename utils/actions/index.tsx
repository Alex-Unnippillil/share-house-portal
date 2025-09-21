"use server";

import type { Database } from "@/lib/supabase";
import { createSupbaseServerClientReadOnly } from "../supaone";
import type { AuthError, PostgrestError, Session } from "@supabase/supabase-js";
import type { BuildingRole } from "@/types/auth";

export type BuildingMembership =
  Database["public"]["Tables"]["building_memberships"]["Row"] & {
    building?: Pick<
      Database["public"]["Tables"]["buildings"]["Row"],
      "id" | "name" | "slug"
    > | null;
  };

export type UserSessionContext = {
  session: Session | null;
  memberships: BuildingMembership[];
  activeMembership: BuildingMembership | null;
  activeBuildingId: string | null;
  activeRole: BuildingRole | null;
};

export type ReadUserSessionResult = {
  data: UserSessionContext;
  error: PostgrestError | AuthError | null;
};

const emptyContext: UserSessionContext = {
  session: null,
  memberships: [],
  activeMembership: null,
  activeBuildingId: null,
  activeRole: null,
};

export async function readUserSession(
  requestedBuildingId?: string
): Promise<ReadUserSessionResult> {
  const supabase = await createSupbaseServerClientReadOnly();
  const sessionResponse = await supabase.auth.getSession();
  const session = sessionResponse.data.session;

  if (!session) {
    return {
      data: emptyContext,
      error: sessionResponse.error,
    };
  }

  const { data, error } = await supabase
    .from("building_memberships")
    .select(
      "id, building_id, role, is_primary, created_at, user_id, buildings:building_id (id, name, slug)"
    )
    .eq("user_id", session.user.id);

  const memberships: BuildingMembership[] = (data ?? []).map(
    ({ buildings, ...membership }) => ({
      ...membership,
      building: buildings ?? null,
    })
  );

  const preferredBuildingId =
    requestedBuildingId ??
    memberships.find((membership) => membership.is_primary)?.building_id ??
    memberships[0]?.building_id ??
    null;

  const activeMembership = preferredBuildingId
    ? memberships.find((membership) => membership.building_id === preferredBuildingId) ??
      null
    : null;

  return {
    data: {
      session,
      memberships,
      activeMembership,
      activeBuildingId: activeMembership?.building_id ?? null,
      activeRole: activeMembership?.role ?? null,
    },
    error: error ?? sessionResponse.error,
  };
}
