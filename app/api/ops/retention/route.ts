import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"
import { createStructuredLogger } from "@/lib/observability/logger"

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function isAuthorized(req: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const received = req.headers.get("authorization")?.replace("Bearer ", "")
  return received === expected
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export async function GET(req: Request) {
  const logger = createStructuredLogger("job", {
    component: "retention_job",
    requestId: req.headers.get("x-request-id") ?? crypto.randomUUID(),
  })

  if (!isAuthorized(req)) {
    logger.warn("retention_job_unauthorized")
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()
  if (!supabase) {
    logger.error("retention_job_configuration_error", {
      reason: "missing_supabase_admin_credentials",
    })
    return Response.json({ error: "Supabase admin credentials are not configured" }, { status: 500 })
  }

  const visitorRetentionDate = isoDaysAgo(180)
  const notificationRetentionDate = isoDaysAgo(90)

  const [visitorDelete, notificationDelete] = await Promise.all([
    supabase.from("visitor_logs").delete().lt("departure_date", visitorRetentionDate),
    supabase.from("notifications").delete().lt("created_at", notificationRetentionDate),
  ])

  logger.info("retention_job_completed", {
    visitorRetentionDate,
    notificationRetentionDate,
    visitorDeleteError: visitorDelete.error?.message,
    notificationDeleteError: notificationDelete.error?.message,
  })

  return Response.json({
    ok: !visitorDelete.error && !notificationDelete.error,
    visitorRetentionDate,
    notificationRetentionDate,
    visitorDeleteError: visitorDelete.error?.message ?? null,
    notificationDeleteError: notificationDelete.error?.message ?? null,
  })
}
