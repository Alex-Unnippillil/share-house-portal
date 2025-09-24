import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import {
  sendBulkNotifications,
  sendEmailNotification,
  sendInAppNotification,
  type InAppNotification,
  type NotificationData,
} from "@/lib/notifications"
import { singleFlight } from "@/lib/utils"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const MAX_PAGE = 50
const DEFAULT_RANGE_DAYS = 30
const MAX_RANGE_DAYS = 90
const MS_PER_DAY = 24 * 60 * 60 * 1000

interface NotificationsQueryContext {
  supabase: SupabaseClient<Database>
  userId: string
  startIso: string
  endIso: string
  from: number
  to: number
}

const loadNotificationsPage = (context: NotificationsQueryContext) =>
  singleFlight(
    [
      "notifications",
      context.userId,
      context.startIso,
      context.endIso,
      context.from,
      context.to,
    ].join(":"),
    () =>
      context.supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", context.userId)
        .gte("created_at", context.startIso)
        .lte("created_at", context.endIso)
        .order("created_at", { ascending: false })
        .range(context.from, context.to)
  )

const isoDateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date format. Expected ISO 8601 string.",
  })
  .transform((value) => new Date(value))

const positiveIntegerParam = (fallback: number, name: string) =>
  z.preprocess(
    (value) => {
      if (value === undefined) return fallback
      if (typeof value === "string") {
        const trimmed = value.trim()
        if (trimmed === "") return Number.NaN
        if (!/^\d+$/.test(trimmed)) return Number.NaN
        return Number.parseInt(trimmed, 10)
      }
      if (typeof value === "number") return value
      return Number.NaN
    },
    z
      .number({ invalid_type_error: `${name} must be a positive integer` })
      .refine((num) => Number.isInteger(num) && num > 0, {
        message: `${name} must be a positive integer`,
      })
  )

const notificationsQuerySchema = z.object({
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  limit: positiveIntegerParam(DEFAULT_LIMIT, "limit"),
  page: positiveIntegerParam(1, "page"),
})

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const [first] = forwarded.split(",").map((part) => part.trim())
    if (first) return first
  }
  return request.headers.get("x-real-ip") ?? "unknown"
}

export async function GET(request: NextRequest) {
  const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries())
  const validation = notificationsQuerySchema.safeParse(rawParams)
  const ipAddress = getClientIp(request)

  if (!validation.success) {
    console.warn("Notifications query validation failed", {
      ipAddress,
      userAgent: request.headers.get("user-agent") ?? "unknown",
      params: rawParams,
      issues: validation.error.issues,
    })

    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: validation.error.flatten(),
      },
      { status: 400 }
    )
  }

  const now = new Date()
  const {
    startDate,
    endDate,
    limit: requestedLimit,
    page: requestedPage,
  } = validation.data

  let normalizedEndDate = endDate ?? now
  if (endDate && endDate > now) {
    normalizedEndDate = now
  }

  if (startDate && startDate > normalizedEndDate) {
    console.warn("Notifications query startDate after endDate", {
      ipAddress,
      userAgent: request.headers.get("user-agent") ?? "unknown",
      params: rawParams,
    })

    return NextResponse.json(
      { error: "startDate must be before or equal to endDate" },
      { status: 400 }
    )
  }

  let normalizedStartDate =
    startDate ?? new Date(normalizedEndDate.getTime() - DEFAULT_RANGE_DAYS * MS_PER_DAY)

  const suspiciousSignals: Array<Record<string, unknown>> = []

  if (endDate && endDate > now) {
    suspiciousSignals.push({
      reason: "future_end_date",
      attemptedEndDate: endDate.toISOString(),
      replacedWith: now.toISOString(),
    })
  }

  const maxRangeStart = new Date(
    normalizedEndDate.getTime() - MAX_RANGE_DAYS * MS_PER_DAY
  )
  if (startDate && startDate < maxRangeStart) {
    suspiciousSignals.push({
      reason: "date_range_clamped",
      attemptedStartDate: startDate.toISOString(),
      minAllowedStart: maxRangeStart.toISOString(),
    })
    normalizedStartDate = maxRangeStart
  }

  let limit = requestedLimit
  if (requestedLimit > MAX_LIMIT) {
    suspiciousSignals.push({
      reason: "limit_clamped",
      attemptedLimit: requestedLimit,
      maxAllowed: MAX_LIMIT,
    })
    limit = MAX_LIMIT
  }

  let page = requestedPage
  if (requestedPage > MAX_PAGE) {
    suspiciousSignals.push({
      reason: "page_clamped",
      attemptedPage: requestedPage,
      maxAllowed: MAX_PAGE,
    })
    page = MAX_PAGE
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore) as SupabaseClient<Database>

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (suspiciousSignals.length > 0) {
    console.warn("Notifications query parameters adjusted", {
      userId: user.id,
      ipAddress,
      userAgent: request.headers.get("user-agent") ?? "unknown",
      adjustments: suspiciousSignals,
    })
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await loadNotificationsPage({
    supabase,
    userId: user.id,
    startIso: normalizedStartDate.toISOString(),
    endIso: normalizedEndDate.toISOString(),
    from,
    to,
  })

  if (error) {
    console.error("Failed to fetch notifications", {
      userId: user.id,
      ipAddress,
      error: error.message,
    })

    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      page,
      limit,
      total: count,
      hasMore:
        typeof count === "number" ? from + (data?.length ?? 0) < count : null,
    },
    filters: {
      startDate: normalizedStartDate.toISOString(),
      endDate: normalizedEndDate.toISOString(),
    },
  })
}

type NotificationRequest =
  | { type: "email"; notification: NotificationData }
  | { type: "in-app"; notification: InAppNotification }
  | {
      type: "bulk"
      notifications: (NotificationData | InAppNotification)[]
    }

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as NotificationRequest

    switch (payload.type) {
      case "email": {
        const result = await sendEmailNotification(payload.notification)
        const status = result.success ? 200 : 400
        return NextResponse.json(result, { status })
      }
      case "in-app": {
        const result = await sendInAppNotification(payload.notification)
        const status = result.success ? 200 : 400
        return NextResponse.json(result, { status })
      }
      case "bulk": {
        const results = await sendBulkNotifications(payload.notifications)
        const success = results.every((entry) => entry.success)
        return NextResponse.json(
          { success, results },
          { status: success ? 200 : 400 }
        )
      }
      default: {
        return NextResponse.json(
          { success: false, error: "Invalid notification request" },
          { status: 400 }
        )
      }
    }
  } catch (error) {
    console.error("Notification API error:", error)
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error sending notification"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
