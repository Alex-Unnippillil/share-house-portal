import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createServerClient } from "@supabase/ssr"

import type { Database, Tables } from "@/lib/supabase"
import ThreadClient, { type ThreadAuthor, type ThreadMessage, type ThreadNode } from "./thread-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function sortThreadTree(nodes: ThreadNode[]) {
  nodes.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) {
      return -1
    }
    if (!a.is_pinned && b.is_pinned) {
      return 1
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  nodes.forEach((node) => sortThreadTree(node.children))
}

export default async function MessagingPage() {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, household_id")
    .eq("id", user.id)
    .single()

  if (profileError) {
    throw profileError
  }

  if (!profile) {
    throw new Error("Profile not found")
  }

  if (!profile.household_id) {
    return (
      <div className="container max-w-3xl space-y-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Join a household to start messaging</CardTitle>
            <CardDescription>
              Household threads keep roommates aligned on chores, maintenance, and community updates. Finish onboarding to join
              the conversation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Once you&apos;re part of a household, you&apos;ll unlock topic-driven threads, message attachments, and Supabase-backed
              RLS protections that ensure conversations stay private to your address.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  type ThreadRow = Tables<"threads"> & {
    created_by_profile: Pick<Tables<"profiles">, "id" | "full_name" | "avatar_url"> | null
  }

  const { data: threadRows, error: threadsError } = await supabase
    .from("threads")
    .select(
      `id, title, topic, summary, metadata, is_pinned, created_at, parent_thread_id, created_by,
       created_by_profile:profiles!threads_created_by_fkey(id, full_name, avatar_url)`
    )
    .eq("household_id", profile.household_id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })

  if (threadsError) {
    throw threadsError
  }

  const threadNodes: ThreadNode[] = (threadRows ?? []).map((row: ThreadRow) => ({
    id: row.id,
    title: row.title,
    topic: row.topic,
    summary: row.summary,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    is_pinned: row.is_pinned,
    created_at: row.created_at,
    parent_thread_id: row.parent_thread_id,
    created_by: row.created_by_profile
      ? {
          id: row.created_by_profile.id,
          full_name: row.created_by_profile.full_name,
          avatar_url: row.created_by_profile.avatar_url,
        }
      : null,
    children: [],
  }))

  const threadMap = new Map<string, ThreadNode>()
  threadNodes.forEach((node) => threadMap.set(node.id, node))

  const rootThreads: ThreadNode[] = []

  threadNodes.forEach((node) => {
    if (node.parent_thread_id) {
      const parent = threadMap.get(node.parent_thread_id)
      if (parent) {
        parent.children.push(node)
        return
      }
    }
    rootThreads.push(node)
  })

  sortThreadTree(rootThreads)

  const threadIds = threadNodes.map((thread) => thread.id)

  type MessageRow = Tables<"messages"> & {
    sender_profile: Pick<Tables<"profiles">, "id" | "full_name" | "avatar_url"> | null
    message_attachments: Tables<"message_attachments">[]
  }

  const messagesByThread = new Map<string, ThreadMessage[]>()

  if (threadIds.length > 0) {
    const { data: messageRows, error: messagesError } = await supabase
      .from("messages")
      .select(
        `id, thread_id, content, created_at, sender_id,
         sender_profile:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
         message_attachments(id, storage_path, file_name, file_size, content_type)`
      )
      .in("thread_id", threadIds)
      .order("created_at", { ascending: true })

    if (messagesError) {
      throw messagesError
    }

    const attachments = (messageRows ?? []).flatMap((message) => message.message_attachments ?? [])
    const uniquePaths = Array.from(new Set(attachments.map((attachment) => attachment.storage_path)))
    const signedUrlMap = new Map<string, string | null>()

    await Promise.all(
      uniquePaths.map(async (path) => {
        const { data: signed, error: signedError } = await supabase.storage.from("docs").createSignedUrl(path, 60 * 60)
        if (signedError || !signed) {
          signedUrlMap.set(path, null)
        } else {
          signedUrlMap.set(path, signed.signedUrl)
        }
      }),
    )

    messageRows?.forEach((row: MessageRow) => {
      const sender: ThreadAuthor = {
        id: row.sender_profile?.id ?? row.sender_id,
        full_name: row.sender_profile?.full_name ?? null,
        avatar_url: row.sender_profile?.avatar_url ?? null,
      }

      const attachmentsWithUrls = (row.message_attachments ?? []).map((attachment) => ({
        id: attachment.id,
        file_name: attachment.file_name,
        file_size: attachment.file_size,
        content_type: attachment.content_type,
        signed_url: signedUrlMap.get(attachment.storage_path) ?? null,
      }))

      const message: ThreadMessage = {
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        attachments: attachmentsWithUrls,
        sender,
      }

      const existing = messagesByThread.get(row.thread_id)
      if (existing) {
        existing.push(message)
      } else {
        messagesByThread.set(row.thread_id, [message])
      }
    })
  }

  const serializedMessages: Record<string, ThreadMessage[]> = {}
  messagesByThread.forEach((value, key) => {
    serializedMessages[key] = value
  })

  const profileAuthor: ThreadAuthor = {
    id: profile.id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
  }

  return (
    <div className="container max-w-6xl space-y-8 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Household threads</h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          Coordinate chores, maintenance, and announcements with secure Supabase-backed messaging that keeps every roommate in the
          loop.
        </p>
      </header>
      <ThreadClient profile={profileAuthor} threads={rootThreads} messagesByThread={serializedMessages} />
    </div>
  )
}
