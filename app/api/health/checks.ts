import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

import type { Database } from "@/lib/supabase"

export type HealthStatus = "pass" | "warn" | "fail"

export interface HealthCheckResult {
  status: HealthStatus
  message?: string
  meta?: Record<string, unknown>
  checkedAt: string
}

export interface HealthResponse {
  status: HealthStatus
  timestamp: string
  checks: Record<string, HealthCheckResult>
}

const SUPABASE_TIMEOUT_MS = 2000

function nowIso() {
  return new Date().toISOString()
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export async function checkSupabase(): Promise<HealthCheckResult> {
  const start = Date.now()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl) {
    return {
      status: "fail",
      message: "NEXT_PUBLIC_SUPABASE_URL is not configured",
      meta: { environment: "NEXT_PUBLIC_SUPABASE_URL" },
      checkedAt: nowIso(),
    }
  }

  if (!serviceRoleKey) {
    return {
      status: "fail",
      message: "SUPABASE_SERVICE_ROLE_KEY is not configured",
      meta: { environment: "SUPABASE_SERVICE_ROLE_KEY" },
      checkedAt: nowIso(),
    }
  }

  try {
    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { error, status } = await withTimeout(
      supabase
        .from("profiles")
        .select("id", { head: true, count: "exact" })
        .limit(1),
      SUPABASE_TIMEOUT_MS,
      "Supabase health check timed out"
    )

    if (error) {
      return {
        status: "fail",
        message: `Supabase query failed: ${error.message}`,
        meta: {
          hint: error.hint,
          details: error.details,
          code: error.code,
          httpStatus: status,
          latencyMs: Date.now() - start,
        },
        checkedAt: nowIso(),
      }
    }

    return {
      status: "pass",
      message: "Supabase connectivity verified",
      meta: {
        httpStatus: status,
        latencyMs: Date.now() - start,
      },
      checkedAt: nowIso(),
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Supabase connectivity error"

    return {
      status: "fail",
      message,
      meta: {
        latencyMs: Date.now() - start,
      },
      checkedAt: nowIso(),
    }
  }
}

export async function checkStripeWebhook(): Promise<HealthCheckResult> {
  const start = Date.now()
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

  if (!secretKey) {
    return {
      status: "fail",
      message: "STRIPE_SECRET_KEY is not configured",
      meta: { environment: "STRIPE_SECRET_KEY" },
      checkedAt: nowIso(),
    }
  }

  if (!webhookSecret) {
    return {
      status: "fail",
      message: "STRIPE_WEBHOOK_SECRET is not configured",
      meta: { environment: "STRIPE_WEBHOOK_SECRET" },
      checkedAt: nowIso(),
    }
  }

  let status: HealthStatus = "pass"
  const warnings: string[] = []

  if (!/^sk_(live|test)_/.test(secretKey)) {
    status = "warn"
    warnings.push("STRIPE_SECRET_KEY does not match expected format")
  }

  if (!webhookSecret.startsWith("whsec_")) {
    status = "warn"
    warnings.push("STRIPE_WEBHOOK_SECRET should start with 'whsec_'")
  }

  try {
    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" })
    const header = stripe.webhooks.generateTestHeaderString({
      payload: "{}",
      secret: webhookSecret,
    })

    return {
      status,
      message:
        warnings.length > 0
          ? warnings.join("; ")
          : "Stripe webhook configuration verified",
      meta: {
        sampleSignature: header.split(",")[0],
        latencyMs: Date.now() - start,
      },
      checkedAt: nowIso(),
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to initialize Stripe SDK"

    return {
      status: "fail",
      message,
      meta: {
        latencyMs: Date.now() - start,
      },
      checkedAt: nowIso(),
    }
  }
}

export async function checkResend(): Promise<HealthCheckResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()

  if (!apiKey) {
    return {
      status: "warn",
      message: "RESEND_API_KEY is not configured; transactional email will be disabled",
      checkedAt: nowIso(),
    }
  }

  return {
    status: "pass",
    message: "Resend API key detected",
    meta: { keyPrefix: apiKey.slice(0, 6) },
    checkedAt: nowIso(),
  }
}

export async function checkDocumenso(): Promise<HealthCheckResult> {
  const apiKey = process.env.DOCUMENSO_API_KEY?.trim()
  const baseUrl = process.env.DOCUMENSO_BASE_URL?.trim()

  if (!apiKey || !baseUrl) {
    return {
      status: "warn",
      message: "Documenso credentials incomplete",
      meta: {
        hasApiKey: Boolean(apiKey),
        hasBaseUrl: Boolean(baseUrl),
      },
      checkedAt: nowIso(),
    }
  }

  return {
    status: "pass",
    message: "Documenso configuration detected",
    meta: {
      baseUrl,
      keyPrefix: apiKey.slice(0, 6),
    },
    checkedAt: nowIso(),
  }
}

export async function checkCalCom(): Promise<HealthCheckResult> {
  const apiKey = process.env.CALCOM_API_KEY?.trim()
  const baseUrl = process.env.CALCOM_BASE_URL?.trim()

  if (!apiKey || !baseUrl) {
    return {
      status: "warn",
      message: "Cal.com credentials incomplete",
      meta: {
        hasApiKey: Boolean(apiKey),
        hasBaseUrl: Boolean(baseUrl),
      },
      checkedAt: nowIso(),
    }
  }

  return {
    status: "pass",
    message: "Cal.com configuration detected",
    meta: {
      baseUrl,
      keyPrefix: apiKey.slice(0, 6),
    },
    checkedAt: nowIso(),
  }
}

export function aggregateStatus(checks: Record<string, HealthCheckResult>): HealthStatus {
  if (Object.values(checks).some((check) => check.status === "fail")) {
    return "fail"
  }

  if (Object.values(checks).some((check) => check.status === "warn")) {
    return "warn"
  }

  return "pass"
}

export function buildHealthResponse(
  checks: Record<string, HealthCheckResult>
): HealthResponse {
  return {
    status: aggregateStatus(checks),
    timestamp: nowIso(),
    checks,
  }
}
