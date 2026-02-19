import { formatDistanceToNow, parseISO } from "date-fns"

import type { Tables } from "@/lib/supabase"

export type ThreadListItem = {
  id: string
  title: string
  category: string
  summary: string
  lastMessageAt: string
  unreadCount: number
  participants: number
  attachments: number
  activity: string
  reactions: string[]
  pinned?: boolean
  locked?: boolean
  unitId?: string | null
  propertyId?: string | null
  isAnnouncement?: boolean
  scheduledFor?: string | null
}

export type Attachment = {
  id: string
  label: string
  description: string
  type: string
}

export type PollOption = {
  label: string
  votes: number
}

export type ThreadPoll = {
  question: string
  closesAt: string
  totalVotes: number
  options: PollOption[]
}

export type PostReaction = {
  emoji: string
  count: number
  active?: boolean
}

export type ThreadPost = {
  id: string
  threadId: string
  createdAt: string
  author: {
    name: string
    role: string
    initials: string
    accent: string
  }
  timestamp: string
  content: string[]
  attachments?: Attachment[]
  poll?: ThreadPoll
  reactions?: PostReaction[]
}

export type AttachmentSummary = {
  id: string
  title: string
  thread: string
  updatedBy: string
  type: string
}

export type PollSnapshot = {
  id: string
  title: string
  thread: string
  closesAt: string
  leadingOption: string
  votes: number
  progress: number
}

export type ThreadFilter = {
  label: string
  active: boolean
}

export type ActiveThread = {
  id: string
  title: string
  summary: string
  category: string
  owner: string
  participants: number
  updated: string
  locked?: boolean
  pinned?: boolean
}

export type CurrentMessagingUser = {
  id: string
  role: string
  unitId: string | null
  propertyId: string | null
  canModerate: boolean
}

export type MessagingThreadData = {
  currentUser: CurrentMessagingUser | null
  threadFilters: ThreadFilter[]
  threadList: ThreadListItem[]
  activeThread: ActiveThread | null
  threadPosts: ThreadPost[]
  attachmentSummary: AttachmentSummary[]
  pollSnapshots: PollSnapshot[]
}

export function formatRelativeTime(isoDate: string | null | undefined) {
  if (!isoDate) {
    return "Just now"
  }

  try {
    const parsed = parseISO(isoDate)

    if (Number.isNaN(parsed.getTime())) {
      return "Just now"
    }

    return formatDistanceToNow(parsed, { addSuffix: true })
  } catch (error) {
    return "Just now"
  }
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function ensurePoll(value: unknown): ThreadPoll | undefined {
  if (!value || typeof value !== "object") {
    return undefined
  }

  const potential = value as Partial<ThreadPoll>

  if (!potential.question) {
    return undefined
  }

  const options = ensureArray<PollOption>(potential.options)

  return {
    question: potential.question,
    closesAt: potential.closesAt ?? "",
    totalVotes:
      typeof potential.totalVotes === "number"
        ? potential.totalVotes
        : options.reduce((total, option) => total + (option.votes ?? 0), 0),
    options: options.map((option) => ({
      label: option.label,
      votes: option.votes ?? 0,
    })),
  }
}

function ensureReactions(value: unknown): PostReaction[] | undefined {
  const reactions = ensureArray<PostReaction>(value)

  if (!reactions.length) {
    return undefined
  }

  return reactions.map((reaction) => ({
    emoji: reaction.emoji,
    count: reaction.count ?? 0,
    active: reaction.active ?? false,
  }))
}

function deriveInitials(name: string) {
  const parts = name.trim().split(/\s+/)

  if (!parts.length) {
    return ""
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }

  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase()
}

export function mapThreadRowToList(row: Tables<"threads">): ThreadListItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    summary: row.summary ?? "",
    lastMessageAt: formatRelativeTime(row.last_message_at),
    unreadCount: row.unread_count ?? 0,
    participants: row.participants_count ?? 0,
    attachments: row.attachments_count ?? 0,
    activity: row.activity ?? "",
    reactions: ensureArray<string>(row.reactions),
    pinned: row.pinned ?? undefined,
    locked: row.locked ?? undefined,
    unitId: row.unit_id,
    propertyId: row.property_id,
    isAnnouncement: row.thread_type === "announcement",
    scheduledFor: row.scheduled_for,
  }
}

export function mapThreadRowToActive(row: Tables<"threads">): ActiveThread {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? "",
    category: row.category,
    owner: row.owner_name ?? "Unknown owner",
    participants: row.participants_count ?? 0,
    updated: formatRelativeTime(row.updated_at ?? row.last_message_at),
    locked: row.locked ?? undefined,
    pinned: row.pinned ?? undefined,
  }
}

export function mapMessageRowToPost(row: Tables<"messages">): ThreadPost {
  const attachments = ensureArray<Attachment>(row.attachments)
  const poll = ensurePoll(row.poll)
  const reactions = ensureReactions(row.reactions)

  const name = row.author_name ?? "Unknown roommate"

  return {
    id: row.id,
    threadId: row.thread_id,
    createdAt: row.created_at,
    author: {
      name,
      role: row.author_role ?? "Roommate",
      initials: row.author_initials ?? deriveInitials(name),
      accent: row.author_accent ?? "bg-primary/10 text-primary",
    },
    timestamp: formatRelativeTime(row.created_at),
    content: ensureArray<string>(row.content).filter(Boolean),
    attachments: attachments.length ? attachments : undefined,
    poll,
    reactions,
  }
}

export function buildThreadFilters(threadList: ThreadListItem[]): ThreadFilter[] {
  const categories = Array.from(new Set(threadList.map((thread) => thread.category))).filter(Boolean)

  return [
    { label: "All topics", active: true },
    ...categories.map((category) => ({ label: category, active: false })),
  ]
}

export function buildAttachmentSummary(
  posts: ThreadPost[],
  activeThread: ActiveThread | null,
): AttachmentSummary[] {
  const threadTitle = activeThread?.title ?? "Thread"

  return posts.flatMap((post) =>
    (post.attachments ?? []).map((attachment) => ({
      id: `${post.id}-${attachment.id}`,
      title: attachment.label,
      thread: threadTitle,
      updatedBy: post.author.name,
      type: attachment.type,
    })),
  )
}

export function buildPollSnapshots(
  posts: ThreadPost[],
  activeThread: ActiveThread | null,
): PollSnapshot[] {
  const threadTitle = activeThread?.title ?? "Thread"

  return posts
    .filter((post) => post.poll && post.poll.options.length)
    .map((post) => {
      const poll = post.poll as ThreadPoll
      const [leading] = [...poll.options].sort((a, b) => b.votes - a.votes)

      return {
        id: post.id,
        title: poll.question,
        thread: threadTitle,
        closesAt: poll.closesAt,
        leadingOption: leading?.label ?? "No votes yet",
        votes: poll.totalVotes,
        progress:
          poll.totalVotes > 0 && leading
            ? Math.round((leading.votes / poll.totalVotes) * 100)
            : 0,
      }
    })
}

export function sortPostsByCreatedAt(posts: ThreadPost[]) {
  return [...posts].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}
