import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

export type MessagesClient = SupabaseClient<Database>
export type MessageRow = Database["public"]["Tables"]["messages"]["Row"]

export type SaveMessageInput = {
  threadId: string
  authorId: string
  contentHtml: string
  contentMarkdown: string
}

type SaveMessageArgs = {
  client: MessagesClient
  message: SaveMessageInput
}

type FetchMessagesArgs = {
  client: MessagesClient
  threadId: string
}

export async function insertThreadMessage({ client, message }: SaveMessageArgs) {
  const { data, error } = await client
    .from("messages")
    .insert({
      thread_id: message.threadId,
      author_id: message.authorId,
      content_html: message.contentHtml,
      content_markdown: message.contentMarkdown,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to insert message: ${error.message}`)
  }

  return data as MessageRow
}

export async function fetchThreadMessages({ client, threadId }: FetchMessagesArgs) {
  const { data, error } = await client
    .from("messages")
    .select("id, thread_id, author_id, content_html, content_markdown, created_at, updated_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`)
  }

  return (data ?? []) as MessageRow[]
}
