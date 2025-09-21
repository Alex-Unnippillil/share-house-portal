"use server"

import { revalidatePath } from "next/cache"

import { createSupbaseServerClient } from "@/utils/supaone"
import type { Database } from "@/lib/supabase"
import type { MessageMetadataShape } from "@/types/messages"
import {
  MODERATOR_ROLES,
  resolveBestAssignment,
} from "@/lib/messages/permissions"

const MESSAGE_METADATA_FIELDS = [
  "clientRef",
  "poll",
  "maintenanceTicketId",
  "flagged",
] as const

export type ModerationAction = Database["public"]["Enums"]["moderation_action"]

function sanitizeMetadata(metadata: unknown): MessageMetadataShape {
  if (!metadata || typeof metadata !== "object") {
    return {}
  }

  const payload = metadata as Record<string, unknown>
  const safe: MessageMetadataShape = {}

  for (const field of MESSAGE_METADATA_FIELDS) {
    if (field in payload) {
      safe[field] = payload[field]
    }
  }

  return { ...payload, ...safe }
}

async function getClientWithSession() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  return { supabase, profileId: session.user.id }
}

async function fetchAssignments(supabase: Awaited<ReturnType<typeof createSupbaseServerClient>>, profileId: string) {
  const { data, error } = await supabase
    .from("tenant_assignments")
    .select("id, building_id, unit_id, role, created_at, profile_id")
    .eq("profile_id", profileId)

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function createThreadAction(input: {
  title: string
  buildingId: string
  unitId?: string | null
  category?: string
  metadata?: MessageMetadataShape
  clientRef?: string
}) {
  const { supabase, profileId } = await getClientWithSession()
  const assignments = await fetchAssignments(supabase, profileId)

  const assignment = resolveBestAssignment(assignments, input.buildingId, input.unitId ?? null)
  if (!assignment) {
    throw new Error("You are not assigned to this building or unit")
  }

  const metadata = {
    ...(input.metadata ?? {}),
    clientRef: input.clientRef,
  }

  const { error, data } = await supabase
    .from("threads")
    .insert({
      building_id: input.buildingId,
      unit_id: input.unitId ?? null,
      title: input.title,
      category: input.category ?? "general",
      metadata,
      created_by: profileId,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/messages")

  return data
}

export async function postMessageAction(input: {
  threadId: string
  body: string
  messageType?: string
  metadata?: MessageMetadataShape
  parentMessageId?: string | null
  clientRef?: string
}) {
  const { supabase, profileId } = await getClientWithSession()

  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .select("id, building_id, unit_id, is_locked")
    .eq("id", input.threadId)
    .maybeSingle()

  if (threadError) {
    throw new Error(threadError.message)
  }

  if (!thread) {
    throw new Error("Thread not found")
  }

  if (thread.is_locked) {
    throw new Error("Thread is locked")
  }

  const assignments = await fetchAssignments(supabase, profileId)
  const assignment = resolveBestAssignment(assignments, thread.building_id, thread.unit_id)

  if (!assignment) {
    throw new Error("You cannot post to this thread")
  }

  const metadata = {
    ...(input.metadata ?? {}),
    clientRef: input.clientRef,
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      thread_id: input.threadId,
      parent_message_id: input.parentMessageId ?? null,
      created_by: profileId,
      body: input.body,
      message_type: input.messageType ?? "text",
      metadata,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await supabase
    .from("threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.threadId)

  return data
}

export async function toggleReactionAction(input: {
  messageId: string
  reactionType: string
  metadata?: Record<string, unknown>
}) {
  const { supabase, profileId } = await getClientWithSession()

  const { data: messageRow, error } = await supabase
    .from("messages")
    .select(
      `
        id,
        metadata,
        message_type,
        thread:threads!inner (
          id,
          building_id,
          unit_id
        )
      `,
    )
    .eq("id", input.messageId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!messageRow) {
    throw new Error("Message not found")
  }

  const assignments = await fetchAssignments(supabase, profileId)
  const assignment = resolveBestAssignment(
    assignments,
    messageRow.thread.building_id,
    messageRow.thread.unit_id,
  )

  if (!assignment) {
    throw new Error("You cannot react to this message")
  }

  const { data: existingReaction } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", input.messageId)
    .eq("profile_id", profileId)
    .eq("reaction_type", input.reactionType)
    .maybeSingle()

  if (existingReaction?.id) {
    await supabase.from("message_reactions").delete().eq("id", existingReaction.id)
    return { removed: true }
  }

  if (input.reactionType.startsWith("poll:")) {
    const allowMultiple = Boolean(
      (messageRow.metadata as Record<string, unknown> | null)?.poll?.allowMultiple,
    )

    if (!allowMultiple) {
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", input.messageId)
        .eq("profile_id", profileId)
        .like("reaction_type", "poll:%")
    }
  }

  const { error: insertError } = await supabase.from("message_reactions").insert({
    message_id: input.messageId,
    profile_id: profileId,
    reaction_type: input.reactionType,
    metadata: input.metadata ?? {},
  })

  if (insertError) {
    throw new Error(insertError.message)
  }

  return { removed: false }
}

export async function moderateMessageAction(input: {
  messageId: string
  action: ModerationAction
  reason?: string
}) {
  const { supabase, profileId } = await getClientWithSession()

  const { data: messageRow, error } = await supabase
    .from("messages")
    .select(
      `
        id,
        metadata,
        is_deleted,
        thread_id,
        thread:threads!inner (
          id,
          building_id,
          unit_id,
          pinned_message_id
        )
      `,
    )
    .eq("id", input.messageId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!messageRow) {
    throw new Error("Message not found")
  }

  const assignments = await fetchAssignments(supabase, profileId)
  const hasPermission = assignments.some(
    (assignment) =>
      assignment.building_id === messageRow.thread.building_id &&
      MODERATOR_ROLES.includes(assignment.role),
  )

  if (!hasPermission) {
    throw new Error("You do not have moderation privileges for this message")
  }

  const now = new Date().toISOString()
  const metadata = sanitizeMetadata(messageRow.metadata)

  if (input.action === "pin") {
    await supabase
      .from("threads")
      .update({ pinned_message_id: input.messageId, updated_at: now })
      .eq("id", messageRow.thread.id)
  } else if (input.action === "unpin") {
    await supabase
      .from("threads")
      .update({ pinned_message_id: null, updated_at: now })
      .eq("id", messageRow.thread.id)
  } else if (input.action === "delete") {
    await supabase
      .from("messages")
      .update({ is_deleted: true, deleted_at: now, metadata })
      .eq("id", input.messageId)
  } else if (input.action === "restore") {
    await supabase
      .from("messages")
      .update({ is_deleted: false, deleted_at: null, metadata })
      .eq("id", input.messageId)
  } else if (input.action === "flag") {
    await supabase
      .from("messages")
      .update({ metadata: { ...metadata, flagged: true } })
      .eq("id", input.messageId)
  } else if (input.action === "resolve_flag") {
    await supabase
      .from("messages")
      .update({ metadata: { ...metadata, flagged: false } })
      .eq("id", input.messageId)
  }

  const { error: moderationError } = await supabase.from("message_moderation").insert({
    message_id: input.messageId,
    moderator_id: profileId,
    action: input.action,
    reason: input.reason ?? null,
  })

  if (moderationError) {
    throw new Error(moderationError.message)
  }

  return { success: true }
}
