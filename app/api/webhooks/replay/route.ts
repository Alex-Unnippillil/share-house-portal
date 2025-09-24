import { NextResponse } from "next/server"
import { z } from "zod"

import {
  recordWebhookReplay,
  type RecordWebhookReplayResult,
  type WebhookReplayError,
  type WebhookReplayErrorCode,
} from "@/lib/data/webhook-deliveries"

const replayRequestSchema = z.object({
  deliveryId: z
    .string({ required_error: "deliveryId is required" })
    .min(1, "deliveryId is required"),
  reason: z
    .string()
    .trim()
    .min(1, "reason cannot be empty")
    .max(280, "reason must be 280 characters or fewer")
    .optional(),
})

const ERROR_STATUS: Record<WebhookReplayErrorCode, number> = {
  DELIVERY_NOT_FOUND: 404,
  REPLAY_ALREADY_PENDING: 409,
}

const getErrorResponse = (
  error: WebhookReplayError | Error
): NextResponse => {
  if ("code" in error && error.code in ERROR_STATUS) {
    const replayError = error as WebhookReplayError
    return NextResponse.json(
      {
        error: replayError.message,
        code: replayError.code,
      },
      { status: ERROR_STATUS[replayError.code] }
    )
  }

  console.error("Webhook replay failed", error)

  return NextResponse.json(
    { error: "Unexpected error scheduling replay" },
    { status: 500 }
  )
}

const sanitizeReason = (reason: string | undefined) => {
  if (!reason) return undefined
  const trimmed = reason.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const buildSuccessResponse = (result: RecordWebhookReplayResult) =>
  NextResponse.json(
    {
      status: "queued",
      delivery: result.delivery,
      audit: result.auditEntry,
    },
    {
      status: 202,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    )
  }

  const validation = replayRequestSchema.safeParse(payload)

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: validation.error.flatten(),
      },
      { status: 400 }
    )
  }

  try {
    const result = recordWebhookReplay({
      deliveryId: validation.data.deliveryId,
      actor: "demo.admin",
      reason: sanitizeReason(validation.data.reason),
    })

    return buildSuccessResponse(result)
  } catch (error) {
    return getErrorResponse(error as WebhookReplayError | Error)
  }
}
