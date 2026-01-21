import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { z } from "zod"

import type { Database, TablesInsert } from "@/lib/supabase"

type MetricName = "LCP" | "TTFB" | "INP" | "CLS"

type BudgetViolation = {
  name: MetricName
  value: number
  limit: number
  rating: "good" | "needs-improvement" | "poor"
}

const METRIC_BUDGETS: Record<MetricName, number> = {
  LCP: 2500,
  TTFB: 800,
  INP: 200,
  CLS: 0.1,
}

const metricSchema = z.object({
  id: z.string().min(1),
  name: z.enum(["LCP", "TTFB", "INP", "CLS"]),
  value: z.number().nonnegative(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  delta: z.number(),
})

const payloadSchema = z.object({
  eventId: z.string().uuid().optional(),
  sessionId: z.string().min(1),
  userId: z.string().uuid().optional().nullable(),
  pathname: z.string().min(1),
  href: z.string().url().optional(),
  referrer: z.string().optional(),
  userAgent: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  navigationType: z.string().optional(),
  viewport: z
    .object({
      width: z.number().int().nonnegative(),
      height: z.number().int().nonnegative(),
    })
    .optional(),
  connection: z
    .object({
      effectiveType: z.string().optional(),
      downlink: z.number().nonnegative().optional(),
      rtt: z.number().nonnegative().optional(),
      saveData: z.boolean().optional(),
    })
    .optional(),
  metrics: z.array(metricSchema),
})

function createSupabaseAdminClient(
  supabaseUrl: string,
  serviceRoleKey: string
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function evaluateBudgets(metrics: z.infer<typeof metricSchema>[]) {
  const violations: BudgetViolation[] = []
  const seen = new Set<MetricName>()

  for (const metric of metrics) {
    const limit = METRIC_BUDGETS[metric.name]
    seen.add(metric.name)
    if (limit !== undefined && metric.value > limit) {
      violations.push({
        name: metric.name,
        value: metric.value,
        limit,
        rating: metric.rating,
      })
    }
  }

  const missing = (Object.keys(METRIC_BUDGETS) as MetricName[]).filter(
    (metricName) => !seen.has(metricName)
  )

  return {
    ok: violations.length === 0,
    violations,
    missing,
  }
}

export async function POST(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    console.error("Supabase credentials missing for perf metrics ingest")
    return NextResponse.json(
      { success: false, error: "Supabase not configured" },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  let payload: z.infer<typeof payloadSchema>
  try {
    const json = await request.json()
    payload = payloadSchema.parse(json)
  } catch (error) {
    console.warn("Invalid perf metrics payload", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid payload", details: error.flatten() },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { success: false, error: "Malformed payload" },
      { status: 400 }
    )
  }

  if (payload.metrics.length === 0) {
    return NextResponse.json(
      { success: false, error: "No metrics received" },
      { status: 400 }
    )
  }

  const budgetResult = evaluateBudgets(payload.metrics)

  const supabase = createSupabaseAdminClient(supabaseUrl, serviceRoleKey)

  const record: TablesInsert<"perf_metrics"> = {
    session_id: payload.sessionId,
    user_id: payload.userId ?? null,
    url: payload.href ?? payload.pathname,
    pathname: payload.pathname,
    referrer: payload.referrer ?? null,
    user_agent: payload.userAgent ?? null,
    locale: payload.locale ?? null,
    timezone: payload.timezone ?? null,
    navigation_type: payload.navigationType ?? null,
    viewport: payload.viewport ?? null,
    connection: payload.connection ?? null,
    metrics: payload.metrics,
    budget_status: {
      ok: budgetResult.ok,
      violations: budgetResult.violations,
      missing: budgetResult.missing,
    },
    metadata: {
      event_id: payload.eventId ?? null,
    },
  }

  const { error } = await supabase.from("perf_metrics").insert(record)
  if (error) {
    console.error("Failed to persist perf metrics sample", error)
    return NextResponse.json(
      { success: false, error: "Database error" },
      { status: 500 }
    )
  }

  if (!budgetResult.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "Performance budget(s) exceeded",
        violations: budgetResult.violations,
        missing: budgetResult.missing,
      },
      { status: 422 }
    )
  }

  return NextResponse.json(
    { success: true, missing: budgetResult.missing },
    { status: 201 }
  )
}
