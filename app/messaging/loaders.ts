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

  const { data: threadRows, error: threadError } = await supabase
    .from("threads")
    .select("*")
    .order("pinned", { ascending: false })
    .order("last_message_at", { ascending: false, nullsFirst: false })

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
    threadFilters,
    threadList,
    activeThread,
    threadPosts,
    attachmentSummary,
    pollSnapshots,
  }
}

