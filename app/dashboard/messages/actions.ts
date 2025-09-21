"use server"

import { z } from "zod"

import { THREAD_WITH_MESSAGES_SELECT, MESSAGE_WITH_RELATIONS_SELECT } from "@/lib/messages/queries"
import { mapMessage, mapThread } from "@/lib/messages/mappers"
import { canAccessThread, canModerate, isStaffRole } from "@/lib/messages/permissions"
import type { MessageWithRelations, ThreadWithRelations, ProfileSummary, PollMetadata } from "@/types/messages"
import type { Database } from "@/lib/supabase"
import { createSupbaseServerClient } from "@/utils/supaone"

const messageInputSchema = z.object({
  threadId: z.string().uuid(),
  parentMessageId: z.string().uuid().optional(),
  content: z.string().min(1),
  messageType: z.enum(["text", "poll"]).default("text"),
  metadata: z.any().optional(),
  clientId: z.string().optional(),
})

const pollOptionSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
})

const createThreadSchema = z.object({
  title: z.string().min(3),
  unitId: z.string().uuid().nullable().optional(),
  initialMessage: z
    .object({
      content: z.string().min(1),
      messageType: z.enum(["text", "poll"]).default("text"),
      metadata: z.any().optional(),
      parentMessageId: z.string().uuid().optional(),
      clientId: z.string().optional(),
    })
    .optional(),
})

const reactionSchema = z.object({
  messageId: z.string().uuid(),
  reaction: z.string().min(1),
})

const voteSchema = z.object({
  messageId: z.string().uuid(),
  optionId: z.string().uuid(),
})

const moderationSchema = z.object({
  messageId: z.string().uuid(),
  action: z.enum(["pin", "unpin", "flag", "unflag", "delete", "restore"]),
  reason: z.string().max(500).optional(),
})

type SupabaseClient = Awaited<ReturnType<typeof createSupbaseServerClient>>
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
type ThreadRow = Database["public"]["Tables"]["threads"]["Row"]
type MessageRow = Database["public"]["Tables"]["messages"]["Row"]

type MessageInsertPayload = z.infer<typeof messageInputSchema>

type MessageResult = {
  message: MessageWithRelations
  thread: Pick<ThreadRow, "id" | "last_message_at" | "pinned_message_id" | "pinned_at" | "pinned_by" | "updated_at">
}

const toProfileSummary = (profile: ProfileRow): ProfileSummary => ({
  id: profile.id,
  full_name: profile.full_name,
  avatar_url: profile.avatar_url,
  role: profile.role,
  building_id: profile.building_id,
  unit_id: profile.unit_id,
})

async function getSupabaseWithProfile() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) {
    throw new Error(userError.message)
  }
  if (!user) {
    throw new Error("Not authenticated")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, building_id, unit_id")
    .eq("id", user.id)
    .single()

  if (profileError) {
    throw new Error(profileError.message)
  }
  if (!profile) {
    throw new Error("Profile not found")
  }
  if (!profile.building_id) {
    throw new Error("Profile is missing a building assignment")
  }

  return { supabase, profile }
}

async function fetchThreadScope(
  supabase: SupabaseClient,
  threadId: string
): Promise<Pick<ThreadRow, "id" | "building_id" | "unit_id">> {
  const { data, error } = await supabase
    .from("threads")
    .select("id, building_id, unit_id")
    .eq("id", threadId)
    .single()
  if (error || !data) {
    throw new Error("Thread not found")
  }
  return data
}

async function fetchThreadWithMessages(
  supabase: SupabaseClient,
  threadId: string
): Promise<ThreadWithRelations> {
  const { data, error } = await supabase
    .from("threads")
    .select(THREAD_WITH_MESSAGES_SELECT)
    .eq("id", threadId)
    .single()
  if (error || !data) {
    throw new Error(error?.message ?? "Unable to load thread")
  }
  return mapThread(data)
}

async function fetchMessageWithRelations(
  supabase: SupabaseClient,
  messageId: string
): Promise<MessageWithRelations> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_WITH_RELATIONS_SELECT)
    .eq("id", messageId)
    .single()
  if (error || !data) {
    throw new Error(error?.message ?? "Unable to load message")
  }
  return mapMessage(data)
}

function normalisePollMetadata(metadata: unknown): PollMetadata {
  const base = (metadata ?? {}) as PollMetadata
  const optionsRaw = base.poll_options ?? []
  const options = Array.isArray(optionsRaw) ? optionsRaw : []
  const parsedOptions = options
    .map((option) => pollOptionSchema.safeParse(option))
    .filter((result): result is z.SafeParseSuccess<{ id: string; label: string }> => result.success)
    .map((result) => result.data)

  if (parsedOptions.length < 2) {
    throw new Error("Poll messages require at least two options")
  }

  const votes = base.poll_votes ?? {}
  return {
    ...base,
    poll_options: parsedOptions,
    poll_votes: votes,
  }
}

async function sendMessageInternal({
  supabase,
  profile,
  payload,
  skipAccessCheck = false,
}: {
  supabase: SupabaseClient
  profile: ProfileSummary
  payload: MessageInsertPayload
  skipAccessCheck?: boolean
}): Promise<MessageResult> {
  const threadScope = await fetchThreadScope(supabase, payload.threadId)

  if (!skipAccessCheck && !canAccessThread(profile, threadScope)) {
    throw new Error("You do not have permission to post in this thread")
  }

  let metadata: PollMetadata | undefined
  if (payload.messageType === "poll") {
    metadata = normalisePollMetadata(payload.metadata)
  } else if (payload.metadata) {
    metadata = payload.metadata as PollMetadata
  }

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      thread_id: payload.threadId,
      parent_message_id: payload.parentMessageId ?? null,
      author_id: profile.id,
      content: payload.content,
      message_type: payload.messageType,
      metadata,
      client_id: payload.clientId ?? null,
    })
    .select(MESSAGE_WITH_RELATIONS_SELECT)
    .single()

  if (error || !inserted) {
    throw new Error(error?.message ?? "Unable to send message")
  }

  const message = mapMessage(inserted)

  const { data: threadMeta, error: threadError } = await supabase
    .from("threads")
    .select("id, last_message_at, pinned_message_id, pinned_at, pinned_by, updated_at")
    .eq("id", payload.threadId)
    .single()

  if (threadError || !threadMeta) {
    throw new Error(threadError?.message ?? "Unable to load thread metadata")
  }

  return {
    message,
    thread: threadMeta,
  }
}

export async function createThreadAction(rawInput: unknown) {
  const input = createThreadSchema.parse(rawInput)
  const { supabase, profile } = await getSupabaseWithProfile()
  const targetUnitId = isStaffRole(profile.role)
    ? input.unitId ?? null
    : profile.unit_id ?? null

  if (!isStaffRole(profile.role) && targetUnitId !== profile.unit_id) {
    throw new Error("You can only create threads for your assigned unit")
  }

  const { data: insertedThread, error: insertError } = await supabase
    .from("threads")
    .insert({
      title: input.title,
      building_id: profile.building_id!,
      unit_id: targetUnitId,
      created_by: profile.id,
    })
    .select("id")
    .single()

  if (insertError || !insertedThread) {
    throw new Error(insertError?.message ?? "Unable to create thread")
  }

  try {
    if (input.initialMessage) {
      await sendMessageInternal({
        supabase,
        profile: toProfileSummary(profile),
        payload: messageInputSchema.parse({
          ...input.initialMessage,
          threadId: insertedThread.id,
        }),
        skipAccessCheck: true,
      })
    }
  } catch (error) {
    await supabase.from("threads").delete().eq("id", insertedThread.id)
    throw error
  }

  return fetchThreadWithMessages(supabase, insertedThread.id)
}

export async function sendMessageAction(rawInput: unknown): Promise<MessageResult> {
  const payload = messageInputSchema.parse(rawInput)
  const { supabase, profile } = await getSupabaseWithProfile()
  return sendMessageInternal({
    supabase,
    profile: toProfileSummary(profile),
    payload,
  })
}

export async function toggleReactionAction(rawInput: unknown): Promise<MessageWithRelations> {
  const input = reactionSchema.parse(rawInput)
  const { supabase, profile } = await getSupabaseWithProfile()

  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", input.messageId)
    .eq("profile_id", profile.id)
    .eq("reaction", input.reaction)
    .maybeSingle()

  if (existing?.id) {
    await supabase.from("message_reactions").delete().eq("id", existing.id)
  } else {
    const { error } = await supabase.from("message_reactions").insert({
      message_id: input.messageId,
      profile_id: profile.id,
      reaction: input.reaction,
    })
    if (error) {
      throw new Error(error.message)
    }
  }

  return fetchMessageWithRelations(supabase, input.messageId)
}

export async function voteOnPollAction(rawInput: unknown): Promise<MessageWithRelations> {
  const input = voteSchema.parse(rawInput)
  const { supabase, profile } = await getSupabaseWithProfile()

  const message = await fetchMessageWithRelations(supabase, input.messageId)

  if (message.message_type !== "poll") {
    throw new Error("Only poll messages support voting")
  }

  if (!canAccessThread(toProfileSummary(profile), message)) {
    throw new Error("You cannot vote on this poll")
  }

  const metadata = (message.metadata ?? {}) as PollMetadata
  const options = metadata.poll_options ?? []
  if (!options.some((option) => option.id === input.optionId)) {
    throw new Error("Poll option not found")
  }

  const votes = metadata.poll_votes ?? {}
  const updatedVotes: Record<string, string[]> = {}
  for (const [optionId, voters] of Object.entries(votes)) {
    const filtered = (voters ?? []).filter((id) => id !== profile.id)
    if (optionId === input.optionId) {
      updatedVotes[optionId] = [...new Set([...filtered, profile.id])]
    } else {
      updatedVotes[optionId] = filtered
    }
  }
  if (!updatedVotes[input.optionId]) {
    updatedVotes[input.optionId] = [profile.id]
  }

  const { error } = await supabase
    .from("messages")
    .update({ metadata: { ...metadata, poll_votes: updatedVotes } })
    .eq("id", message.id)

  if (error) {
    throw new Error(error.message)
  }

  return fetchMessageWithRelations(supabase, message.id)
}

export async function moderateMessageAction(rawInput: unknown): Promise<MessageResult> {
  const input = moderationSchema.parse(rawInput)
  const { supabase, profile } = await getSupabaseWithProfile()

  if (!canModerate(profile.role)) {
    throw new Error("You do not have permission to moderate messages")
  }

  const message = await fetchMessageWithRelations(supabase, input.messageId)

  if (!message.thread_id) {
    throw new Error("Message missing thread context")
  }

  const now = new Date().toISOString()
  const updates: Partial<MessageRow> = {}
  const moderationMetadata: Record<string, unknown> = {}

  switch (input.action) {
    case "flag":
      updates.status = "flagged"
      moderationMetadata.status = "flagged"
      if (input.reason) {
        moderationMetadata.reason = input.reason
      }
      break
    case "unflag":
      updates.status = "active"
      moderationMetadata.status = "active"
      break
    case "delete":
      updates.status = "deleted"
      updates.deleted_at = now
      moderationMetadata.status = "deleted"
      break
    case "restore":
      updates.status = "active"
      updates.deleted_at = null
      moderationMetadata.status = "active"
      break
    case "pin":
    case "unpin":
      break
    default:
      break
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from("messages")
      .update(updates)
      .eq("id", message.id)
    if (updateError) {
      throw new Error(updateError.message)
    }
  }

  if (input.action === "pin") {
    const { error } = await supabase
      .from("threads")
      .update({
        pinned_message_id: message.id,
        pinned_at: now,
        pinned_by: profile.id,
      })
      .eq("id", message.thread_id)
    if (error) {
      throw new Error(error.message)
    }
  }

  if (input.action === "unpin") {
    const { error } = await supabase
      .from("threads")
      .update({ pinned_message_id: null, pinned_at: null, pinned_by: null })
      .eq("id", message.thread_id)
    if (error) {
      throw new Error(error.message)
    }
  }

  const { error: moderationError } = await supabase.from("message_moderation").insert({
    message_id: message.id,
    thread_id: message.thread_id,
    building_id: message.building_id,
    action: input.action,
    reason: input.reason,
    performed_by: profile.id,
    metadata: moderationMetadata,
  })
  if (moderationError) {
    throw new Error(moderationError.message)
  }

  const refreshedMessage = await fetchMessageWithRelations(supabase, message.id)
  const { data: threadMeta, error: threadError } = await supabase
    .from("threads")
    .select("id, last_message_at, pinned_message_id, pinned_at, pinned_by, updated_at")
    .eq("id", message.thread_id)
    .single()

  if (threadError || !threadMeta) {
    throw new Error(threadError?.message ?? "Unable to refresh thread metadata")
  }

  return {
    message: refreshedMessage,
    thread: threadMeta,
  }
}
