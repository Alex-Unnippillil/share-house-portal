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

type MessageSnapshot = {
  id: string;
  content: string;
  updated_at: string | null;
  version: number | null;
  thread_id: string | null;
  author_id: string | null;
};

export type MessageConflictPayload = ConflictDetails<
  MessageSnapshot,
  Partial<Pick<MessageSnapshot, "content">>
>;

const messageUpdateSchema = z.object({
  messageId: z.string().uuid(),
  updates: z.object({
    content: z.string().min(1, "Message content cannot be empty").optional(),
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

type MessageUpdatePayload = z.infer<typeof messageUpdateSchema>;

export type MessageRecord = MessageSnapshot & {
  created_at: string;
  reactions?: any;
};

export type Message = MessageRecord;

export async function updateMessageAction(
  payload: MessageUpdatePayload
): Promise<ActionResult<Message, MessageConflictPayload>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const typedSupabase = supabase as unknown as TypedSupabaseClient;

  try {
    const parsed = messageUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      const firstError = flattened.fieldErrors?.[Object.keys(flattened.fieldErrors)[0]]?.[0];
      return { success: false, error: firstError || "Invalid message update payload." };
    }

    const { messageId, updates, expectedVersion, expectedUpdatedAt, resolution } = parsed.data;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in to update messages." };
    }

    const { data: message, error: messageError } = await (supabase as any)
      .from("messages")
      .select("id, content, updated_at, version, thread_id, author_id, created_at")
      .eq("id", messageId)
      .single<MessageRecord>();

    if (messageError || !message) {
      console.error("Message not found", messageError);
      return { success: false, error: "Message not found." };
    }

    let role: Awaited<ReturnType<typeof fetchMemberRole>> | null = null;
    try {
      role = await fetchMemberRole(typedSupabase, user.id);
    } catch (roleError) {
      console.warn("Unable to resolve role when updating message:", roleError);
    }

    const canEdit =
      message.author_id === user.id || role === "property_manager" || role === "admin";

    if (!canEdit) {
      return { success: false, error: "You do not have permission to edit this message." };
    }

    const conflictCheck = evaluateConflict({
      current: message,
      incoming: updates,
      expectedVersion: expectedVersion ?? undefined,
      expectedUpdatedAt: expectedUpdatedAt ?? undefined,
      message: "This message was updated by someone else while you were editing.",
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
      sanitizedUpdates[key] = value;
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return {
        success: true,
        data: message,
        message: "No changes detected.",
      };
    }

    const nextVersion = (message.version ?? 1) + 1;

    const { data: updated, error: updateError } = await (supabase as any)
      .from("messages")
      .update({
        ...sanitizedUpdates,
        version: nextVersion,
      })
      .eq("id", messageId)
      .select("id, content, updated_at, version, thread_id, author_id, created_at")
      .single<Message>();

    if (updateError || !updated) {
      console.error("Failed to update message", updateError);
      return { success: false, error: "Failed to update message." };
    }

    if (resolution) {
      const mergedFields = resolution.mergedFields ?? extractChangedFields(sanitizedUpdates, message as any);
      try {
        await supabase.rpc("log_conflict_resolution", {
          p_entity_type: "message",
          p_entity_id: messageId,
          p_resolution: resolution.type,
          p_local_version: resolution.baseVersion ?? expectedVersion ?? null,
          p_remote_version: message.version ?? null,
          p_merged_fields: mergedFields,
        });
      } catch (logError) {
        console.warn("Failed to log message conflict resolution:", logError);
      }
    }

    revalidatePath("/messaging");

    return {
      success: true,
      data: updated,
      message: "Message updated successfully.",
    };
  } catch (error) {
    console.error("Unexpected error in updateMessageAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}
