import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

import { sendEmailNotification, sendInAppNotification } from "."

export type DigestFrequency =
  Database["public"]["Tables"]["profiles"]["Row"]["digest_frequency"]

const DIGEST_TEMPLATE = "activity-digest"
const DIGEST_SUMMARY_METADATA_KEY = "digest_summary"
const MAX_NOTIFICATIONS_PER_DIGEST = 20

const DIGEST_INTERVAL_MS: Record<DigestFrequency, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
}

export type DigestIneligibilityReason = "within_quiet_hours" | "interval_not_met"

export interface DigestEligibilityResult {
  eligible: boolean
  reason?: DigestIneligibilityReason
  windowStart: Date
}

function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null
  const match = value.match(/^(\d{2}):(\d{2})(?::\d{2})?$/)
  if (!match) return null
  const hours = Number.parseInt(match[1] ?? "0", 10)
  const minutes = Number.parseInt(match[2] ?? "0", 10)

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  return hours * 60 + minutes
}

export function isWithinQuietHours(
  now: Date,
  quietHoursStart: string | null | undefined,
  quietHoursEnd: string | null | undefined,
): boolean {
  const startMinutes = parseTimeToMinutes(quietHoursStart)
  const endMinutes = parseTimeToMinutes(quietHoursEnd)

  if (
    startMinutes === null ||
    endMinutes === null ||
    startMinutes === endMinutes
  ) {
    return false
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

export function shouldSendDigest({
  now,
  frequency,
  lastDigestAt,
  quietHoursStart,
  quietHoursEnd,
}: {
  now: Date
  frequency: DigestFrequency
  lastDigestAt: Date | null
  quietHoursStart: string | null
  quietHoursEnd: string | null
}): DigestEligibilityResult {
  const nowTime = now.getTime()
  const intervalMs = DIGEST_INTERVAL_MS[frequency]
  const intervalStart = new Date(nowTime - intervalMs)

  let windowStart = intervalStart
  if (lastDigestAt) {
    const lastTime = lastDigestAt.getTime()
    if (lastTime <= nowTime && lastTime >= intervalStart.getTime()) {
      windowStart = lastDigestAt
    }
  }

  if (isWithinQuietHours(now, quietHoursStart, quietHoursEnd)) {
    return { eligible: false, reason: "within_quiet_hours", windowStart }
  }

  if (lastDigestAt && nowTime - lastDigestAt.getTime() < intervalMs) {
    return { eligible: false, reason: "interval_not_met", windowStart }
  }

  return { eligible: true, windowStart }
}

async function fetchLastDigestAt(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<Date | null> {
  const { data, error } = await client
    .from("email_notifications")
    .select("sent_at")
    .eq("user_id", userId)
    .eq("template", DIGEST_TEMPLATE)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to look up last digest: ${error.message}`)
  }

  if (!data?.sent_at) {
    return null
  }

  const parsed = new Date(data.sent_at)
  return Number.isNaN(parsed.valueOf()) ? null : parsed
}

interface ProfileDigestRow {
  id: string
  email: string | null
  full_name: string | null
  digest_frequency: DigestFrequency | null
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

interface NotificationRow {
  id: string
  title: string
  message: string
  created_at: string
}

export interface DigestProcessingResult {
  userId: string
  status: "sent" | "skipped" | "failed"
  reason?: string
  notifications?: number
}

function sanitizeNotificationsForEmail(notifications: NotificationRow[]) {
  return notifications.map((notification) => ({
    title: notification.title,
    message: notification.message,
    createdAt: notification.created_at,
  }))
}

function buildDigestSubject(
  frequency: DigestFrequency,
  notificationCount: number,
): string {
  const cadenceLabel = frequency === "weekly" ? "Weekly" : "Daily"
  return `${cadenceLabel} household digest (${notificationCount} update${
    notificationCount === 1 ? "" : "s"
  })`
}

export async function processDigestForAllProfiles(
  client: SupabaseClient<Database>,
  now: Date = new Date(),
): Promise<DigestProcessingResult[]> {
  const results: DigestProcessingResult[] = []

  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select(
      "id, email, full_name, digest_frequency, quiet_hours_start, quiet_hours_end",
    )

  if (profilesError) {
    throw new Error(
      `Failed to load profiles for digest processing: ${profilesError.message}`,
    )
  }

  if (!profiles?.length) {
    return results
  }

  for (const profile of profiles as ProfileDigestRow[]) {
    const userId = profile.id

    if (!profile.email) {
      results.push({ userId, status: "skipped", reason: "missing_email" })
      continue
    }

    const frequency = (profile.digest_frequency ?? "daily") as DigestFrequency

    let lastDigestAt: Date | null
    try {
      lastDigestAt = await fetchLastDigestAt(client, userId)
    } catch (error) {
      console.error("Failed to fetch last digest timestamp", {
        userId,
        error,
      })
      results.push({ userId, status: "failed", reason: "last_digest_lookup" })
      continue
    }

    const eligibility = shouldSendDigest({
      now,
      frequency,
      lastDigestAt,
      quietHoursStart: profile.quiet_hours_start,
      quietHoursEnd: profile.quiet_hours_end,
    })

    if (!eligibility.eligible) {
      results.push({
        userId,
        status: "skipped",
        reason: eligibility.reason,
      })
      continue
    }

    const windowStartIso = eligibility.windowStart.toISOString()
    const windowEndIso = now.toISOString()

    const { data: notifications, error: notificationsError } = await client
      .from("notifications")
      .select("id, title, message, created_at")
      .eq("user_id", userId)
      .gte("created_at", windowStartIso)
      .lte("created_at", windowEndIso)
      .or(
        `metadata->>${DIGEST_SUMMARY_METADATA_KEY}.is.null,metadata->>${DIGEST_SUMMARY_METADATA_KEY}.eq.false`,
      )
      .order("created_at", { ascending: true })
      .limit(MAX_NOTIFICATIONS_PER_DIGEST)

    if (notificationsError) {
      console.error("Failed to load notifications for digest", {
        userId,
        error: notificationsError,
      })
      results.push({
        userId,
        status: "failed",
        reason: "notification_query_failed",
      })
      continue
    }

    if (!notifications || notifications.length === 0) {
      results.push({ userId, status: "skipped", reason: "no_activity" })
      continue
    }

    const emailData = {
      fullName: profile.full_name,
      frequency,
      notifications: sanitizeNotificationsForEmail(notifications as NotificationRow[]),
      windowStart: windowStartIso,
      windowEnd: windowEndIso,
    }

    const emailResult = await sendEmailNotification({
      to: profile.email,
      subject: buildDigestSubject(frequency, notifications.length),
      template: DIGEST_TEMPLATE,
      data: emailData,
      userId,
    })

    if (!emailResult.success) {
      console.error("Failed to send digest email", {
        userId,
        error: emailResult.error,
      })
      results.push({ userId, status: "failed", reason: "email_failed" })
      continue
    }

    const inAppResult = await sendInAppNotification({
      userId,
      title:
        frequency === "weekly"
          ? "Weekly digest delivered"
          : "Daily digest delivered",
      message: `We just emailed ${notifications.length} update${
        notifications.length === 1 ? "" : "s"
      } from the last ${frequency === "weekly" ? "week" : "day"}.`,
      type: "info",
      actionUrl: "/notifications",
      metadata: {
        [DIGEST_SUMMARY_METADATA_KEY]: true,
        total_notifications: notifications.length,
        window_start: windowStartIso,
        window_end: windowEndIso,
      },
    })

    if (!inAppResult.success) {
      console.warn("Digest email sent but in-app notification failed", {
        userId,
        error: inAppResult.error,
      })
    }

    results.push({
      userId,
      status: "sent",
      notifications: notifications.length,
    })
  }

  return results
}

export async function runDigestJob(
  now: Date = new Date(),
): Promise<DigestProcessingResult[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase configuration for digest job. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.",
    )
  }

  const serviceClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return processDigestForAllProfiles(serviceClient, now)
}
