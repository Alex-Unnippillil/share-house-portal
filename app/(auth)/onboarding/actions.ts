"use server";

import type { User } from "@supabase/supabase-js";

import { createSupbaseServerClient } from "@/utils/supaone";

type RawMemberRecord = {
  id?: string | number;
  user_id?: string;
  role?: string | null;
  household_id?: string | null;
  created_at?: string | null;
};

export type MemberRecord = {
  id: string | number;
  user_id: string;
  role: string;
  household_id: string | null;
  created_at: string | null;
};

export type OnboardingMemberResult =
  | { user: null; member: null }
  | { user: User; member: MemberRecord };

function normalizeMember(userId: string, member: RawMemberRecord | null): MemberRecord {
  const id = member?.id ?? userId;

  return {
    id,
    user_id: member?.user_id ?? userId,
    role: member?.role ?? "tenant",
    household_id: member?.household_id ?? null,
    created_at: member?.created_at ?? null,
  };
}

export async function reconcileOnboardingMember(): Promise<OnboardingMemberResult> {
  const supabase = await createSupbaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Unable to load authenticated user: ${userError.message}`);
  }

  if (!user) {
    return { user: null, member: null };
  }

  const { data: member, error: memberError } = await supabase
    .from("members" as any)
    .select("id, user_id, role, household_id, created_at")
    .eq("user_id", user.id)
    .maybeSingle<RawMemberRecord>();

  if (memberError) {
    throw new Error(`Unable to load member row for user ${user.id}: ${memberError.message}`);
  }

  if (member) {
    return { user, member: normalizeMember(user.id, member) };
  }

  const { data: insertedMember, error: insertError } = await supabase
    .from("members" as any)
    .insert({ user_id: user.id, role: "tenant" })
    .select("id, user_id, role, household_id, created_at")
    .maybeSingle<RawMemberRecord>();

  if (insertError) {
    throw new Error(`Unable to reconcile member row for user ${user.id}: ${insertError.message}`);
  }

  return { user, member: normalizeMember(user.id, insertedMember ?? null) };
}
