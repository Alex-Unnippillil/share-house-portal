import { z } from "zod"

import {
  sendBulkNotifications,
  sendEmailNotification,
  sendInAppNotification,
  type InAppNotification,
  type NotificationData,
} from "@/lib/notifications"
import {
  paymentReceiptSchema,
  sendPaymentReceiptEmail,
  type PaymentReceiptPayload,
} from "@/lib/payment-receipt"
import type { Database } from "@/lib/supabase"
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin"

const DEFAULT_MAX_ATTEMPTS = 5
const BASE_RETRY_DELAY_MS = 2_000
const MAX_RETRY_DELAY_MS = 60_000

const jobPayloadSchemas = {
  email: z.object({ notification: z.custom<NotificationData>() }),
  in_app: z.object({ notification: z.custom<InAppNotification>() }),
  bulk: z.object({
    notifications: z
      .array(z.custom<NotificationData | InAppNotification>())
      .min(1),
  }),
  payment_receipt: z.object({ payload: paymentReceiptSchema }),
} as const

type NotificationJobType = keyof typeof jobPayloadSchemas

type NotificationJobRecord = Database["public"]["Tables"]["notification_jobs"]["Row"]
type NotificationJobInsert = Database["public"]["Tables"]["notification_jobs"]["Insert"]

interface EnqueueOptions {
  maxAttempts?: number
  scheduledAt?: Date
  correlationId?: string
}

interface JobResult {
  jobId: string
  status: "completed" | "retry-scheduled" | "dead-letter"
  attempts: number
  error?: string
}

export async function enqueueNotificationJob(
  jobType: NotificationJobType,
  payload: Record<string, unknown>,
  options: EnqueueOptions = {}
) {
  const supabase = getSupabaseServiceRoleClient()
  const insertPayload: NotificationJobInsert = {
    job_type: jobType,
    payload: payload as NotificationJobInsert["payload"],
    max_attempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    scheduled_at: (options.scheduledAt ?? new Date()).toISOString(),
    correlation_id: options.correlationId ?? null,
  }

  const { data, error } = await supabase
    .from("notification_jobs")
    .insert(insertPayload)
    .select("id")
    .single()

  if (error) {
    throw new Error(`Failed to enqueue ${jobType} job: ${error.message}`)
  }

  return { jobId: data.id }
}

export async function enqueueEmailNotification(
  notification: NotificationData,
  options?: EnqueueOptions
) {
  return enqueueNotificationJob("email", { notification }, options)
}

export async function enqueueInAppNotification(
  notification: InAppNotification,
  options?: EnqueueOptions
) {
  return enqueueNotificationJob("in_app", { notification }, options)
}

export async function enqueueBulkNotifications(
  notifications: (NotificationData | InAppNotification)[],
  options?: EnqueueOptions
) {
  return enqueueNotificationJob("bulk", { notifications }, options)
}

export async function enqueuePaymentReceiptEmail(
  payload: PaymentReceiptPayload,
  options?: EnqueueOptions
) {
  return enqueueNotificationJob("payment_receipt", { payload }, options)
}

export async function processNotificationJobs({
  limit = 10,
}: { limit?: number } = {}) {
  const supabase = getSupabaseServiceRoleClient()
  const nowIso = new Date().toISOString()

  const { data: jobs, error } = await supabase
    .from("notification_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to load pending jobs: ${error.message}`)
  }

  const results: JobResult[] = []

  for (const job of jobs ?? []) {
    const lockResult = await supabase
      .from("notification_jobs")
      .update({
        status: "processing",
        attempts: job.attempts + 1,
        locked_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("*")
      .single()

    if (lockResult.error || !lockResult.data) {
      if (lockResult.error) {
        console.error("Failed to lock job", {
          jobId: job.id,
          error: lockResult.error.message,
        })
      }
      continue
    }

    const lockedJob = lockResult.data

    try {
      await executeJob(lockedJob)

      await supabase
        .from("notification_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", lockedJob.id)

      results.push({
        jobId: lockedJob.id,
        status: "completed",
        attempts: lockedJob.attempts,
      })
    } catch (jobError) {
      const message =
        jobError instanceof Error ? jobError.message : String(jobError)
      const attempts = lockedJob.attempts
      const maxAttempts = lockedJob.max_attempts ?? DEFAULT_MAX_ATTEMPTS

      if (attempts >= maxAttempts) {
        await moveToDeadLetterQueue(lockedJob, message)
        results.push({
          jobId: lockedJob.id,
          status: "dead-letter",
          attempts,
          error: message,
        })
      } else {
        const delay = Math.min(
          BASE_RETRY_DELAY_MS * 2 ** (attempts - 1),
          MAX_RETRY_DELAY_MS
        )
        const nextScheduled = new Date(Date.now() + delay)

        await supabase
          .from("notification_jobs")
          .update({
            status: "pending",
            scheduled_at: nextScheduled.toISOString(),
            last_error: message,
          })
          .eq("id", lockedJob.id)

        results.push({
          jobId: lockedJob.id,
          status: "retry-scheduled",
          attempts,
          error: message,
        })
      }
    }
  }

  return { processed: results.length, results }
}

async function executeJob(job: NotificationJobRecord) {
  const schema = jobPayloadSchemas[job.job_type as NotificationJobType]

  if (!schema) {
    throw new Error(`Unsupported job type: ${job.job_type}`)
  }

  const validation = schema.safeParse(job.payload)

  if (!validation.success) {
    throw new Error(
      `Invalid payload for job ${job.id}: ${validation.error.message}`
    )
  }

  switch (job.job_type as NotificationJobType) {
    case "email": {
      const result = await sendEmailNotification(validation.data.notification, {
        jobId: job.id,
      })

      if (!result.success) {
        throw new Error(result.error ?? "Email delivery failed")
      }
      break
    }
    case "in_app": {
      const result = await sendInAppNotification(validation.data.notification, {
        jobId: job.id,
      })

      if (!result.success) {
        throw new Error(result.error ?? "In-app notification failed")
      }
      break
    }
    case "bulk": {
      const results = await sendBulkNotifications(
        validation.data.notifications
      )

      const failed = results.filter((entry) => !entry.success)

      if (failed.length > 0) {
        throw new Error(
          `Bulk notification failed for ${failed.length} of ${results.length} entries`
        )
      }
      break
    }
    case "payment_receipt": {
      await sendPaymentReceiptEmail(validation.data.payload)
      break
    }
    default:
      throw new Error(`Unhandled job type: ${job.job_type}`)
  }
}

async function moveToDeadLetterQueue(job: NotificationJobRecord, error: string) {
  const supabase = getSupabaseServiceRoleClient()

  await supabase.from("notification_dead_letters").insert({
    id: job.id,
    job_type: job.job_type,
    payload: job.payload,
    attempts: job.attempts,
    error,
    correlation_id: job.correlation_id,
  })

  await supabase.from("notification_jobs").delete().eq("id", job.id)
}
