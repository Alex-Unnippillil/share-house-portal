import type { Tables } from "@/lib/supabase"
import {
  type DigestFrequency,
  type NotificationPreferences,
} from "@/lib/notification-preferences"
import {
  fetchAllNotificationPreferences,
  withDefaultPreferences,
} from "@/lib/notification-preferences-repository"
import { getServiceRoleSupabaseClient } from "@/utils/supabase-service-role"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

interface NotificationDigestItem {
  id: string
  title: string
  message: string
  createdAt: string
  metadata: Tables<"notifications">["metadata"]
}

export interface NotificationDigestBatch {
  userId: string
  frequency: DigestFrequency
  notifications: NotificationDigestItem[]
}

function calculateWindowStart(frequency: DigestFrequency, now: Date): string {
  const start = new Date(now)
  if (frequency === "weekly") {
    start.setDate(start.getDate() - 7)
  } else {
    start.setDate(start.getDate() - 1)
  }
  return start.toISOString()
}

function selectColumns() {
  return "id, title, message, created_at, metadata"
}

async function fetchUnreadNotifications(
  client: TypedSupabaseClient,
  userId: string,
  preferences: NotificationPreferences,
  now: Date,
) {
  const since = calculateWindowStart(preferences.digestFrequency, now)
  const { data, error } = await client
    .from("notifications")
    .select(selectColumns())
    .eq("user_id", userId)
    .eq("read", false)
    .gte("created_at", since)
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function buildNotificationDigests(
  client: TypedSupabaseClient,
  now: Date = new Date(),
): Promise<NotificationDigestBatch[]> {
  const preferenceRecords = await fetchAllNotificationPreferences(client)

  if (preferenceRecords.length === 0) {
    return []
  }

  const batches: NotificationDigestBatch[] = []

  for (const record of preferenceRecords) {
    const preferences = withDefaultPreferences(record.preferences)
    const notifications = await fetchUnreadNotifications(
      client,
      record.userId,
      preferences,
      now,
    )

    if (notifications.length === 0) {
      continue
    }

    batches.push({
      userId: record.userId,
      frequency: preferences.digestFrequency,
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        createdAt: notification.created_at ?? now.toISOString(),
        metadata: notification.metadata ?? null,
      })),
    })
  }

  return batches
}

export async function generateNotificationDigests(
  now: Date = new Date(),
): Promise<NotificationDigestBatch[]> {
  const client = getServiceRoleSupabaseClient()

  if (!client) {
    return []
  }

  return buildNotificationDigests(client, now)
}
