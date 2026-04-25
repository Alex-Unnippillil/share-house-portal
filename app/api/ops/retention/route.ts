import { createClient } from "@supabase/supabase-js"

import { writeRetentionExecutionAuditLog } from "@/lib/audit"
import {
  applyNotificationPurge,
  applySignedDocumentMetadataMinimization,
  applyVisitorLogAnonymization,
  applyVisitorLogPurge,
  buildRetentionPlan,
} from "@/lib/data/retention"
import { createStructuredLogger } from "@/lib/observability/logger"
import type { Database } from "@/lib/supabase"

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

function parseDryRunMode(req: Request) {
  const { searchParams } = new URL(req.url)
  return searchParams.get("dryRun") === "true"
}

function parseActor(req: Request) {
  const { searchParams } = new URL(req.url)
  return searchParams.get("actor") ?? req.headers.get("x-retention-actor") ?? "system:cron-retention"
}

function parseJobId(req: Request) {
  const { searchParams } = new URL(req.url)
  return searchParams.get("jobId") ?? req.headers.get("x-job-id") ?? crypto.randomUUID()
}

export async function GET(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()
  const dryRun = parseDryRunMode(req)
  const actorId = parseActor(req)
  const jobId = parseJobId(req)

  const logger = createStructuredLogger("job", {
    component: "retention_job",
    requestId,
    jobId,
    actorId,
    mode: dryRun ? "dry-run" : "execute",
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
    return Response.json(
      { error: "Supabase admin credentials are not configured" },
      { status: 500 }
    )
  }

  const plan = buildRetentionPlan()

  const results = await Promise.all([
    applyVisitorLogAnonymization(supabase, plan, { dryRun }),
    applyVisitorLogPurge(supabase, plan, { dryRun }),
    applySignedDocumentMetadataMinimization(supabase, plan, { dryRun }),
    applyNotificationPurge(supabase, plan, { dryRun }),
  ])

  await Promise.all(
    results.map((result) =>
      writeRetentionExecutionAuditLog(supabase, {
        actorId,
        jobId,
        entity: result.entity,
        mode: dryRun ? "dry-run" : "execute",
        candidates: result.candidates,
        affected: result.affected,
        metadata: {
          policy: plan,
          requestId,
        },
        error: result.error,
      })
    )
  )

  const hasError = results.some((result) => Boolean(result.error))

  logger.info("retention_job_completed", {
    dryRun,
    actorId,
    jobId,
    policy: plan,
    hasError,
    results,
  })

  return Response.json(
    {
      ok: !hasError,
      dryRun,
      actorId,
      jobId,
      policy: plan,
      results,
    },
    { status: hasError ? 500 : 200 }
  )
}
