"use server";

import { cookies } from "next/headers";

import { recordNetworkBatch } from "./instrumentation";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";
import createSupabaseServer from "@/utils/supabase-server";

export interface VisitorUnitMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

export interface VisitorHostProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  unit_id: string | null;
}

export interface VisitorBookingContext {
  userId: string;
  unitId: string | null;
  hostProfile: VisitorHostProfile;
  roommates: VisitorUnitMember[];
  propertyManager: VisitorUnitMember | null;
}

interface VisitorContextRpcPayload {
  host_profile: VisitorHostProfile;
  roommates: VisitorUnitMember[];
  property_manager: VisitorUnitMember | null;
}

interface VisitorContextOptions {
  client?: TypedSupabaseClient;
}

export async function getVisitorBookingContext(
  options: VisitorContextOptions = {}
): Promise<VisitorBookingContext> {
  const supabase = options.client ?? createSupabaseServer(cookies());
  let requestCount = 0;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  requestCount += 1;

  if (authError || !authData?.user) {
    throw new Error("You must be logged in to book a visitor.");
  }

  const user = authData.user;

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_visitor_booking_context",
    { p_user_id: user.id }
  );
  requestCount += 1;

  if (rpcError || !rpcData) {
    throw new Error(rpcError?.message || "Unable to load visitor booking context.");
  }

  const payload = rpcData as VisitorContextRpcPayload;
  const hostProfile = payload.host_profile;

  if (!hostProfile) {
    throw new Error("Visitor host profile was not returned by the loader.");
  }

  const roommates = (payload.roommates || []).filter(
    (member) => member.id !== user.id &&
      (member.role === "tenant" || member.role === "roommate")
  );

  const propertyManager = payload.property_manager;

  if (!propertyManager) {
    throw new Error("Property manager information is required for visitor notifications.");
  }

  recordNetworkBatch("visitors.page", requestCount);

  return {
    userId: user.id,
    unitId: hostProfile.unit_id,
    hostProfile,
    roommates,
    propertyManager,
  };
}
