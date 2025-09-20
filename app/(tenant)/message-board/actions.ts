"use server"

import { createSupbaseServerClient } from "@/utils/supaone"
import type { Database, Json } from "@/lib/supabase"

const MESSAGE_SELECT = `
  id,
  created_at,
  updated_at,
  property_id,
  unit_id,
  author_id,
  body,
  attachments,
  pinned,
  pinned_at,
  pinned_by,
  removed,
  removed_at,
  removed_by,
  moderation_note,
  updated_by,
  author:profiles!tenant_messages_author_id_fkey ( id, full_name, avatar_url, role ),
  property:properties!tenant_messages_property_id_fkey ( id, name ),
  unit:property_units!tenant_messages_unit_id_fkey ( id, label )
`

export type TenantMessageRecord = Database["public"]["Tables"]["tenant_messages"]["Row"]
export type TenantMessageWithRelations = TenantMessageRecord & {
  author: Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "id" | "full_name" | "avatar_url" | "role"
  > | null
  property: Pick<Database["public"]["Tables"]["properties"]["Row"], "id" | "name"> | null
  unit: Pick<Database["public"]["Tables"]["property_units"]["Row"], "id" | "label"> | null
}

export type TenantMembershipRecord = Database["public"]["Tables"]["tenant_property_memberships"]["Row"]

export type ListTenantMessagesInput = {
  propertyId: string
  unitId?: string | null
  cursor?: string
  limit?: number
  includeRemoved?: boolean
}

export type ListTenantMessagesResult = {
  pinned: TenantMessageWithRelations[]
  messages: TenantMessageWithRelations[]
  nextCursor: string | null
}

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function applyThreadScope(
  query: any,
  propertyId: string,
  unitId: string | null | undefined
) {
  let scoped = query.eq("property_id", propertyId)
  if (unitId === null) {
    scoped = scoped.is("unit_id", null)
  } else if (unitId) {
    scoped = scoped.eq("unit_id", unitId)
  }
  return scoped
}

export async function listTenantMessages({
  propertyId,
  unitId,
  cursor,
  limit = DEFAULT_PAGE_SIZE,
  includeRemoved = false,
}: ListTenantMessagesInput): Promise<ListTenantMessagesResult> {
  const supabase = await createSupbaseServerClient()
  const size = Math.min(Math.max(limit, 1), MAX_PAGE_SIZE)

  const pinnedQuery = applyThreadScope(
    supabase.from("tenant_messages").select(MESSAGE_SELECT),
    propertyId,
    unitId
  )
    .eq("pinned", true)
    .order("created_at", { ascending: false })

  if (!includeRemoved) {
    pinnedQuery.eq("removed", false)
  }

  const { data: pinnedData, error: pinnedError } = await pinnedQuery
  if (pinnedError) {
    throw pinnedError
  }

  let listQuery = applyThreadScope(
    supabase.from("tenant_messages").select(MESSAGE_SELECT),
    propertyId,
    unitId
  )
    .eq("pinned", false)
    .order("created_at", { ascending: false })
    .limit(size + 1)

  if (!includeRemoved) {
    listQuery = listQuery.eq("removed", false)
  }

  if (cursor) {
    listQuery = listQuery.lt("created_at", cursor)
  }

  const { data: messageData, error: listError } = await listQuery
  if (listError) {
    throw listError
  }

  let nextCursor: string | null = null
  let messages = messageData ?? []
  if (messages.length > size) {
    const next = messages.pop()
    nextCursor = next?.created_at ?? null
  }

  return {
    pinned: (pinnedData ?? []) as TenantMessageWithRelations[],
    messages: messages as TenantMessageWithRelations[],
    nextCursor,
  }
}

export type CreateTenantMessageInput = {
  propertyId: string
  unitId?: string | null
  body: string
  attachments?: Array<{ url: string; name?: string; type?: string }>
}

export async function createTenantMessage({
  propertyId,
  unitId,
  body,
  attachments = [],
}: CreateTenantMessageInput): Promise<TenantMessageWithRelations> {
  const supabase = await createSupbaseServerClient()
  const payload: Database["public"]["Tables"]["tenant_messages"]["Insert"] = {
    property_id: propertyId,
    unit_id: unitId ?? null,
    body,
    attachments: attachments as unknown as Json,
  }

  const { data, error } = await supabase
    .from("tenant_messages")
    .insert(payload)
    .select(MESSAGE_SELECT)
    .single()

  if (error) {
    throw error
  }

  return data as TenantMessageWithRelations
}

export type TenantMessageSubscriptionConfig = {
  channel: string
  event: "*"
  schema: "public"
  table: "tenant_messages"
  filter: string
}

export async function getTenantMessageById(
  id: number
): Promise<TenantMessageWithRelations | null> {
  const supabase = await createSupbaseServerClient()
  const { data, error } = await supabase
    .from("tenant_messages")
    .select(MESSAGE_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as TenantMessageWithRelations) ?? null
}

export async function subscribeToTenantMessages({
  propertyId,
  unitId,
}: {
  propertyId: string
  unitId?: string | null
}): Promise<TenantMessageSubscriptionConfig> {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  const channelId = `tenant-messages:${propertyId}:${unitId ?? "all"}`
  let filter = `property_id=eq.${propertyId}`
  if (unitId === null) {
    filter = `${filter},unit_id=is.null`
  } else if (unitId) {
    filter = `${filter},unit_id=eq.${unitId}`
  }

  return {
    channel: channelId,
    event: "*",
    schema: "public",
    table: "tenant_messages",
    filter,
  }
}

export type ModerateTenantMessageInput = {
  messageId: number
  pinned?: boolean
  removed?: boolean
  moderationNote?: string | null
}

export async function moderateTenantMessage({
  messageId,
  pinned,
  removed,
  moderationNote,
}: ModerateTenantMessageInput): Promise<TenantMessageWithRelations> {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  const updates: Database["public"]["Tables"]["tenant_messages"]["Update"] = {
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }

  if (typeof pinned !== "undefined") {
    updates.pinned = pinned
    updates.pinned_at = pinned ? new Date().toISOString() : null
    updates.pinned_by = pinned ? user.id : null
  }

  if (typeof removed !== "undefined") {
    updates.removed = removed
    updates.removed_at = removed ? new Date().toISOString() : null
    updates.removed_by = removed ? user.id : null
  }

  if (typeof moderationNote !== "undefined") {
    updates.moderation_note = moderationNote
  }

  const { data, error } = await supabase
    .from("tenant_messages")
    .update(updates)
    .eq("id", messageId)
    .select(MESSAGE_SELECT)
    .single()

  if (error) {
    throw error
  }

  return data as TenantMessageWithRelations
}
