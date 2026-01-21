import type { Database } from "@/lib/supabase"

export type NotificationRow =
  Database["public"]["Tables"]["notifications"]["Row"]
export type NotificationThreadPreferenceRow =
  Database["public"]["Tables"]["notification_thread_preferences"]["Row"]
export type ThreadPreferenceSummary = Pick<
  NotificationThreadPreferenceRow,
  "thread_id" | "muted" | "source" | "thread_label"
>

export interface NotificationGroup {
  threadId: string
  source: string
  title: string
  muted: boolean
  notifications: NotificationRow[]
  unreadCount: number
  lastActivity: string
}

export const GENERAL_THREAD_ID = "general"
export const GENERAL_SOURCE = "general"

const SOURCE_LABELS: Record<string, string> = {
  documents: "Documents",
  maintenance: "Maintenance",
  payments: "Payments",
  visitors: "Visitor Bookings",
}

function extractThreadLabelFromMetadata(
  metadata: NotificationRow["metadata"]
): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined
  }

  const record = metadata as Record<string, unknown>
  const candidates = [
    record.threadLabel,
    record.thread_label,
    record.threadTitle,
    record.sourceLabel,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }

  return undefined
}

export function ensureThreadId(value?: string | null): string {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }
  return GENERAL_THREAD_ID
}

export function ensureThreadSource(value?: string | null): string {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }
  return GENERAL_SOURCE
}

export function formatThreadLabel(
  source: string,
  providedLabel?: string | null
): string {
  if (providedLabel && providedLabel.trim().length > 0) {
    return providedLabel.trim()
  }

  const normalizedSource = source.trim().toLowerCase()
  if (SOURCE_LABELS[normalizedSource]) {
    return SOURCE_LABELS[normalizedSource]
  }

  const cleaned = source.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
  if (cleaned.length === 0) {
    return "General"
  }

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase())
}

export function buildNotificationGroups(
  notifications: NotificationRow[],
  preferences: ThreadPreferenceSummary[] = []
): NotificationGroup[] {
  const preferenceMap = new Map<string, ThreadPreferenceSummary>()
  for (const preference of preferences) {
    preferenceMap.set(ensureThreadId(preference.thread_id), preference)
  }

  const groups = new Map<string, NotificationGroup>()

  for (const notification of notifications) {
    const threadId = ensureThreadId(notification.thread_id)
    const source = ensureThreadSource(notification.source)
    const preference = preferenceMap.get(threadId)

    const explicitLabel =
      notification.thread_label ??
      preference?.thread_label ??
      extractThreadLabelFromMetadata(notification.metadata)

    const label = formatThreadLabel(source, explicitLabel)

    let group = groups.get(threadId)
    if (!group) {
      group = {
        threadId,
        source,
        title: label,
        muted: preference?.muted ?? false,
        notifications: [],
        unreadCount: 0,
        lastActivity: new Date(0).toISOString(),
      }
      groups.set(threadId, group)
    } else if (group.title !== label) {
      const hasCustomTitle =
        group.title !== formatThreadLabel(group.source) ||
        Boolean(preference?.thread_label)
      if (!hasCustomTitle) {
        group.title = label
      }
    }

    group.notifications.push(notification)
  }

  const sortedGroups: NotificationGroup[] = []
  for (const group of groups.values()) {
    const sortedNotifications = group.notifications
      .slice()
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return bTime - aTime
      })

    const unreadCount = sortedNotifications.reduce((total, entry) => {
      return total + (entry.read ? 0 : 1)
    }, 0)

    const latestCreatedAt =
      sortedNotifications[0]?.created_at ?? new Date(0).toISOString()

    sortedGroups.push({
      ...group,
      notifications: sortedNotifications,
      unreadCount,
      lastActivity: latestCreatedAt,
    })
  }

  return sortedGroups.sort((a, b) => {
    const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
    const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
    return bTime - aTime
  })
}
