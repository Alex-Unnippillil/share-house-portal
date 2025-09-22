import { Separator } from "@/components/ui/separator"
import { createClient } from "@/utils/supabase/server"

import MessagesFeed from "./messages-feed"
import type { MessageRow } from "./message-reducer"

type MessagesPageSearchParams = Record<string, string | string[] | undefined>

const takeFirst = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value

const truncateIdentifier = (value: string) =>
  value.length > 10 ? `${value.slice(0, 8)}…` : value

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: MessagesPageSearchParams
}) {
  const householdId = takeFirst(searchParams?.householdId)
  const threadId = takeFirst(searchParams?.threadId)

  if (!householdId || !threadId) {
    return (
      <div className="container max-w-4xl space-y-6 py-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Select a household and thread to browse the realtime conversation feed.
          </p>
          <Separator />
        </header>
        <p className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-sm text-muted-foreground">
          Provide <code>householdId</code> and <code>threadId</code> search parameters to load a specific
          conversation.
        </p>
      </div>
    )
  }

  const supabase = createClient()

  const [userResult, messageResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("messages")
      .select("*")
      .eq("household_id", householdId)
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true }),
  ])

  const {
    data: { user },
  } = userResult

  const { data: rows, error } = messageResult

  const messages = (rows ?? []) as MessageRow[]

  return (
    <div className="container max-w-4xl space-y-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Household <span className="font-medium text-foreground">{truncateIdentifier(householdId)}</span>
          , thread <span className="font-medium text-foreground">{truncateIdentifier(threadId)}</span>
          . Stay in sync with your roommates in realtime.
        </p>
        <Separator />
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Unable to load messages: {error.message}
          </p>
        ) : null}
      </header>
      <MessagesFeed
        key={`${householdId}-${threadId}`}
        initialMessages={messages}
        householdId={householdId}
        threadId={threadId}
        currentUserId={user?.id ?? null}
        initialError={error?.message}
      />
    </div>
  )
}
