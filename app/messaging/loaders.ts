"use server"

import "server-only"

import { cookies } from "next/headers"

import {
  buildAttachmentSummary,
  buildPollSnapshots,
  buildThreadFilters,
  mapMessageRowToPost,
  mapThreadRowToActive,
  mapThreadRowToList,
  sortPostsByCreatedAt,
  type MessagingThreadData,
  type ThreadPost,
} from "./types"

import createSupabaseServer from "@/utils/supabase-server"

export async function loadMessagingThreadData(): Promise<MessagingThreadData> {
  const cookieStore = cookies()
  const supabase = createSupabaseServer(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role, unit_id")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null }

  const canModerate = profile?.role === "property_manager" || profile?.role === "admin"

  const currentUser = user
    ? {
        id: user.id,
        role: profile?.role ?? "tenant",
        unitId: profile?.unit_id ?? null,
        propertyId: null,
        canModerate,
      }
    : null

  let threadQuery = supabase
    .from("threads")
    .select("*")
    .is("deleted_at", null)
    .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
    .order("pinned", { ascending: false })
    .order("last_message_at", { ascending: false, nullsFirst: false })

  if (currentUser?.unitId) {
    threadQuery = threadQuery.or(`unit_id.eq.${currentUser.unitId},unit_id.is.null`)
  }

  const { data: threadRows, error: threadError } = await threadQuery

  if (threadError) {
    console.error("Failed to load threads", threadError)
  }

  const threadList = (threadRows ?? []).map(mapThreadRowToList)

  const activeThreadRow =
    (threadRows ?? []).find((thread) => thread.pinned) ?? threadRows?.[0] ?? null

  const activeThread = activeThreadRow ? mapThreadRowToActive(activeThreadRow) : null

  let threadPosts: ThreadPost[] = []

  if (activeThread) {
    const { data: messageRows, error: messageError } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", activeThread.id)
      .order("created_at", { ascending: true })

    if (messageError) {
      console.error("Failed to load messages", messageError)
    }

    threadPosts = sortPostsByCreatedAt((messageRows ?? []).map(mapMessageRowToPost))
  }

  const threadFilters = buildThreadFilters(threadList)
  const attachmentSummary = buildAttachmentSummary(threadPosts, activeThread)
  const pollSnapshots = buildPollSnapshots(threadPosts, activeThread)

  return {
    currentUser,
    threadFilters,
    threadList,
    activeThread,
    threadPosts,
    attachmentSummary,
    pollSnapshots,
  }
}
