"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Json } from "@/lib/supabase";
import { createSupbaseServerClient } from "@/utils/supaone";

const memberRoleSchema = z.enum(["tenant", "roommate", "property_manager", "admin"]);
const memberStatusSchema = z.enum(["active", "resigned"]);

const createMemberSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6),
    confirm: z.string().min(6),
    username: z.string().trim().min(2),
    role: memberRoleSchema,
    status: memberStatusSchema,
  })
  .refine((value) => value.password === value.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

const updateMemberSchema = z
  .object({
    email: z.string().email().optional(),
    username: z.string().trim().min(2).optional(),
    role: memberRoleSchema.optional(),
    status: memberStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

const uuidSchema = z.string().uuid();

type ActionResult<T = undefined> = {
  ok: boolean;
  message: string;
  data?: T;
};

type ActorContext = {
  userId: string;
  role: "property_manager" | "admin";
};

async function requirePrivilegedActor(): Promise<ActionResult<ActorContext>> {
  const supabase = await createSupbaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { ok: false, message: "You must be signed in to manage members." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile?.role) {
    return { ok: false, message: "Unable to verify your account role." };
  }

  if (profile.role !== "property_manager" && profile.role !== "admin") {
    return { ok: false, message: "Only property managers and admins can manage members." };
  }

  return {
    ok: true,
    message: "Authorized",
    data: { userId: authData.user.id, role: profile.role },
  };
}

async function writeMemberAuditLog(params: {
  actor: ActorContext;
  action: string;
  targetId: string;
  metadata?: Json;
}) {
  const supabase = await createSupbaseServerClient();

  await supabase.from("audit_logs").insert({
    action: params.action,
    event_type: "member_account",
    actor_id: params.actor.userId,
    actor_role: params.actor.role,
    target_type: "profile",
    target_id: params.targetId,
    metadata: params.metadata ?? null,
  });
}

export async function createMember(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  const authorized = await requirePrivilegedActor();

  if (!authorized.ok || !authorized.data) {
    return { ok: false, message: authorized.message };
  }

  const parsed = createMemberSchema.safeParse(payload);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid member payload." };
  }

  const { email, username, role, status } = parsed.data;
  const supabase = await createSupbaseServerClient();

  const { data: inserted, error } = await supabase
    .from("profiles")
    .insert({
      email,
      full_name: username,
      role,
      metadata: { status },
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, message: error?.message ?? "Unable to create member." };
  }

  await writeMemberAuditLog({
    actor: authorized.data,
    action: "member.create",
    targetId: inserted.id,
    metadata: {
      email,
      role,
      status,
    },
  });

  revalidatePath("/dashboard/members");

  return { ok: true, message: "Member created.", data: { id: inserted.id } };
}

export async function updateMemberById(
  id: string,
  payload: unknown
): Promise<ActionResult> {
  const targetId = uuidSchema.safeParse(id);

  if (!targetId.success) {
    return { ok: false, message: "Invalid member id." };
  }

  const authorized = await requirePrivilegedActor();

  if (!authorized.ok || !authorized.data) {
    return { ok: false, message: authorized.message };
  }

  const parsed = updateMemberSchema.safeParse(payload);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid member update payload." };
  }

  const supabase = await createSupbaseServerClient();
  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, metadata")
    .eq("id", targetId.data)
    .single();

  if (existingError || !existing) {
    return { ok: false, message: existingError?.message ?? "Member not found." };
  }

  const nextMetadata = {
    ...(typeof existing.metadata === "object" && existing.metadata !== null
      ? (existing.metadata as Record<string, unknown>)
      : {}),
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
  };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      email: parsed.data.email,
      full_name: parsed.data.username,
      role: parsed.data.role,
      metadata: nextMetadata,
    })
    .eq("id", targetId.data);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  await writeMemberAuditLog({
    actor: authorized.data,
    action: "member.update",
    targetId: targetId.data,
    metadata: {
      previous: {
        email: existing.email,
        username: existing.full_name,
        role: existing.role,
        status:
          typeof existing.metadata === "object" && existing.metadata && "status" in existing.metadata
            ? ((existing.metadata as Record<string, unknown>).status === "resigned" ? "resigned" : "active")
            : "active",
      },
      next: parsed.data,
    },
  });

  revalidatePath("/dashboard/members");

  return { ok: true, message: "Member updated." };
}

export async function deleteMemberById(id: string): Promise<ActionResult> {
  const targetId = uuidSchema.safeParse(id);

  if (!targetId.success) {
    return { ok: false, message: "Invalid member id." };
  }

  const authorized = await requirePrivilegedActor();

  if (!authorized.ok || !authorized.data) {
    return { ok: false, message: authorized.message };
  }

  const supabase = await createSupbaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", targetId.data)
    .single();

  if (existingError || !existing) {
    return { ok: false, message: existingError?.message ?? "Member not found." };
  }

  const { error: deleteError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", targetId.data);

  if (deleteError) {
    return { ok: false, message: deleteError.message };
  }

  await writeMemberAuditLog({
    actor: authorized.data,
    action: "member.delete",
    targetId: targetId.data,
    metadata: {
      email: existing.email,
      username: existing.full_name,
      role: existing.role,
    },
  });

  revalidatePath("/dashboard/members");

  return { ok: true, message: "Member deleted." };
}

export async function readMembers() {
  const supabase = await createSupbaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at, metadata")
    .in("role", ["tenant", "roommate", "property_manager", "admin"])
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return data.flatMap((member) => {
    const metadata =
      typeof member.metadata === "object" && member.metadata !== null
        ? (member.metadata as Record<string, unknown>)
        : {};

    const status: "active" | "resigned" = metadata.status === "resigned" ? "resigned" : "active";

    if (member.role !== "tenant" && member.role !== "roommate" && member.role !== "property_manager" && member.role !== "admin") {
      return []
    }

    return [{
      id: member.id,
      name: member.full_name ?? member.email ?? "Unknown member",
      role: member.role,
      createdAt: member.created_at
        ? new Date(member.created_at).toLocaleDateString()
        : "Unknown",
      status,
    }]
  });
}
