import { createClient } from '@supabase/supabase-js'

import { requirePrivilegedApiAccess } from '@/lib/api-auth'
import type { Database, Tables } from '@/lib/supabase'
import { createStructuredLogger } from '@/lib/observability/logger'
import { incrementOperationalMetric } from '@/lib/observability/metrics'
import { consumeRateLimit, createRateLimitResponse, getRateLimitKeyFromRequest } from '@/lib/rate-limit'

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

function isCronAuthorized(req: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const received = req.headers.get('authorization')?.replace('Bearer ', '')
  return received === expected
}

export async function GET(req: Request) {
  const logger = createStructuredLogger('job', {
    component: 'data_integrity_job',
    requestId: req.headers.get('x-request-id') ?? crypto.randomUUID(),
  })

  const cronAuthorized = isCronAuthorized(req)
  let rateLimitKey = 'cron:anonymous'

  if (!cronAuthorized) {
    const authContext = await requirePrivilegedApiAccess()
    if (authContext instanceof Response) {
      logger.warn('data_integrity_job_unauthorized')
      return authContext
    }

    rateLimitKey = getRateLimitKeyFromRequest(req, `user:${authContext.userId}`)
  }

  const rateLimit = consumeRateLimit({
    bucket: 'api:ops:data-integrity',
    key: cronAuthorized ? 'cron:authorized' : rateLimitKey,
    limit: 10,
    windowMs: 60_000,
  })

  if (!rateLimit.ok) {
    return createRateLimitResponse(rateLimit)
  }

  const supabase = createSupabaseAdminClient()
  if (!supabase) {
    logger.error('data_integrity_job_configuration_error', {
      reason: 'missing_supabase_admin_credentials',
    })
    return Response.json({ error: 'Supabase admin credentials are not configured' }, { status: 500 })
  }

  const startedAt = Date.now()

  const invalidVisitorQuery = await supabase
    .from('visitor_logs')
    .select('*')

  const invalidVisitorWindows = (invalidVisitorQuery.data ?? []).filter(
    (entry: Tables<'visitor_logs'>) => {
      const arrivalDate = entry.check_in_date
      const departureDate = entry.check_out_date
      if (!arrivalDate || !departureDate) return false
      return new Date(arrivalDate).getTime() > new Date(departureDate).getTime()
    }
  ).length

  const danglingPaymentQuery = await supabase
    .from('rent_payments')
    .select('id', { count: 'exact', head: true })
    .is('tenant_id', null)
    .is('unit_id', null)

  const summary = {
    invalidVisitorWindows,
    danglingPayments: danglingPaymentQuery.count ?? 0,
    durationMs: Date.now() - startedAt,
  }

  const hasIssue = summary.invalidVisitorWindows > 0 || summary.danglingPayments > 0

  logger.info('data_integrity_job_completed', {
    ...summary,
    hasIssue,
  })

  if (hasIssue) {
    incrementOperationalMetric('webhook_failures_total', {
      source: 'data_integrity_job',
      provider: 'supabase',
      eventType: 'integrity_violation',
    })
  }

  return Response.json({ ok: true, ...summary, hasIssue })
}
