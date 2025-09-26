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
import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"
import { parseRequestJson } from "@/lib/validation"
import {
  notificationRequestSchema,
  type NotificationRequest,
} from "@/lib/validation/notifications"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const MAX_PAGE = 50
const DEFAULT_RANGE_DAYS = 30
const MAX_RANGE_DAYS = 90
const MS_PER_DAY = 24 * 60 * 60 * 1000

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

    return jsonError("REQUEST_VALIDATION_ERROR", {
      message: "Invalid query parameters",
      details: validation.error.flatten(),
    })
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

    return jsonError("REQUEST_VALIDATION_ERROR", {
      message: "startDate must be before or equal to endDate",
    })
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
    return jsonError("AUTH_UNAUTHORIZED")
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

  const { data, error, count } = await supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .gte("created_at", normalizedStartDate.toISOString())
    .lte("created_at", normalizedEndDate.toISOString())
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("Failed to fetch notifications", {
      userId: user.id,
      ipAddress,
      error: error.message,
    })

    return jsonError("DATA_FETCH_FAILED", {
      message: "Failed to fetch notifications",
      details: { reason: error.message },
    })
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

export async function POST(request: Request) {
  const validationResult = await parseRequestJson(
    request,
    notificationRequestSchema,
    { validationErrorMessage: "Invalid notification payload." }
  )

  if (!validationResult.success) {
    return validationResult.error
  }

  const payload: NotificationRequest = validationResult.data

  try {
    switch (payload.type) {
      case "email": {
        const result = await sendEmailNotification(payload.notification)
        if (!result.success) {
          return jsonError("UPSTREAM_SERVICE_ERROR", {
            message: result.error ?? "Failed to send email notification",
            details: { provider: "resend" },
          })
        }

        return NextResponse.json(result)
      }
      case "in-app": {
        const result = await sendInAppNotification(payload.notification)
        if (!result.success) {
          return jsonError("DATA_FETCH_FAILED", {
            message:
              result.error ?? "Failed to persist in-app notification",
          })
        }

        return NextResponse.json(result)
      }
      case "bulk": {
        const results = await sendBulkNotifications(payload.notifications)
        const success = results.every((entry) => entry.success)
        if (!success) {
          return jsonError("UPSTREAM_SERVICE_ERROR", {
            message: "One or more notifications failed to send",
            details: { results },
          })
        }

        return NextResponse.json({ success, results })
      }
      default: {
        return jsonError("REQUEST_VALIDATION_ERROR", {
          message: "Invalid notification request type",
        })
      }
    }
  } catch (error) {
    console.error("Notification API error:", error)
    return jsonErrorFromUnknown(error, "UPSTREAM_SERVICE_ERROR")
  }
}
