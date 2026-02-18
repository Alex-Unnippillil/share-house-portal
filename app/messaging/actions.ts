"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

import type { Json, TablesInsert } from "@/lib/supabase"
import createSupabaseServer from "@/utils/supabase-server"

type Scope = {
  userId: string
  role: string
  unitId: string | null
  propertyId: string | null
  canModerate: boolean
}

async function getScope(): Promise<Scope> {
  const cookieStore = cookies()
  const supabase = createSupabaseServer(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("You must be signed in to manage messaging.")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, unit_id")
    .eq("id", user.id)
    .maybeSingle()

  const role = profile?.role ?? "tenant"
  const canModerate = role === "property_manager" || role === "admin"

  return {
    userId: user.id,
    role,
    unitId: profile?.unit_id ?? null,
    propertyId: null,
    canModerate,
  }
}

async function insertAuditLog(eventType: string, metadata: Json) {
  const cookieStore = cookies()
  const supabase = createSupabaseServer(cookieStore)
  const scope = await getScope()

  await supabase.from("audit_logs").insert({
    actor_id: scope.userId,
    event_type: eventType,
    unit_id: scope.unitId,
    property_id: scope.propertyId,
    metadata,
  } satisfies TablesInsert<"audit_logs">)
}

export async function moderateThreadAction(formData: FormData) {
  const scope = await getScope()

  if (!scope.canModerate) {
    throw new Error("Only property managers and admins can moderate threads.")
  }

  const threadId = String(formData.get("threadId") ?? "")
  const action = String(formData.get("action") ?? "")

  if (!threadId || !action) {
    return
  }

  const cookieStore = cookies()
  const supabase = createSupabaseServer(cookieStore)

  if (action === "delete") {
    await supabase.from("threads").update({ deleted_at: new Date().toISOString() }).eq("id", threadId)
  }

  if (action === "pin") {
    await supabase.from("threads").update({ pinned: true }).eq("id", threadId)
  }

  if (action === "unpin") {
    await supabase.from("threads").update({ pinned: false }).eq("id", threadId)
  }

  if (action === "lock") {
    await supabase.from("threads").update({ locked: true }).eq("id", threadId)
  }

  if (action === "unlock") {
    await supabase.from("threads").update({ locked: false }).eq("id", threadId)
  }

  if (action === "flag") {
    await supabase.from("threads").update({ flagged_at: new Date().toISOString() }).eq("id", threadId)
  }

  await insertAuditLog("thread.moderated", {
    action,
    threadId,
  })

  revalidatePath("/messaging")
}

export async function publishAnnouncementAction(formData: FormData) {
  const scope = await getScope()

  if (!scope.canModerate) {
    throw new Error("Only property managers and admins can publish announcements.")
  }

  const title = String(formData.get("title") ?? "").trim()
  const body = String(formData.get("body") ?? "").trim()
  const category = String(formData.get("category") ?? "announcement").trim() || "announcement"
  const pin = formData.get("pin") === "on"
  const scheduleAt = String(formData.get("scheduleAt") ?? "").trim()

  if (!title || !body) {
    return
  }

  const now = new Date()
  const scheduledFor = scheduleAt ? new Date(scheduleAt).toISOString() : null

  const cookieStore = cookies()
  const supabase = createSupabaseServer(cookieStore)

  const threadInsert: TablesInsert<"threads"> = {
    title,
    category,
    summary: body.slice(0, 180),
    activity: "Announcement published",
    pinned: pin,
    owner_name: "Property management",
    participants_count: 0,
    unread_count: 0,
    attachments_count: 0,
    reactions: [],
    last_message_at: scheduledFor ?? now.toISOString(),
    unit_id: scope.unitId,
    property_id: scope.propertyId,
    thread_type: "announcement",
    scheduled_for: scheduledFor,
    announcement_visible_from: scheduledFor ?? now.toISOString(),
  }

  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .insert(threadInsert)
    .select("id")
    .single()

  if (threadError || !thread) {
    throw new Error(threadError?.message ?? "Unable to publish announcement")
  }

  const messageInsert: TablesInsert<"messages"> = {
    thread_id: thread.id,
    author_id: scope.userId,
    author_name: "Property management",
    author_role: scope.role,
    content: [body],
  }

  await supabase.from("messages").insert(messageInsert)

  await insertAuditLog("announcement.published", {
    threadId: thread.id,
    scheduledFor,
    pinned: pin,
  })

  revalidatePath("/messaging")
}

export async function reportAbuseAction(formData: FormData) {
  const scope = await getScope()
  const threadId = String(formData.get("threadId") ?? "")
  const messageId = String(formData.get("messageId") ?? "")
  const reason = String(formData.get("reason") ?? "").trim()

  if (!threadId || !reason) {
    return
  }

  const cookieStore = cookies()
  const supabase = createSupabaseServer(cookieStore)

  await supabase.from("audit_logs").insert({
    actor_id: scope.userId,
    event_type: "abuse.reported",
    property_id: scope.propertyId,
    unit_id: scope.unitId,
    thread_id: threadId,
    message_id: messageId || null,
    metadata: { reason },
  } satisfies TablesInsert<"audit_logs">)

  await supabase
    .from("threads")
    .update({ flagged_at: new Date().toISOString() })
    .eq("id", threadId)

  revalidatePath("/messaging")
}
