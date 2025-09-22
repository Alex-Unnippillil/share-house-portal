import { readFile } from "fs/promises"
import path from "path"
import process from "process"
import { fileURLToPath } from "url"
import { performance } from "perf_hooks"
import { randomUUID } from "crypto"
import { createClient } from "@supabase/supabase-js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function loadConfig() {
  const configPath = path.resolve(__dirname, "../config/uptime.json")
  const configRaw = await readFile(configPath, "utf-8")
  const config = JSON.parse(configRaw)
  if (!Array.isArray(config.regions) || config.regions.length === 0) {
    throw new Error("Uptime configuration must define at least one region")
  }
  if (!Array.isArray(config.endpoints) || config.endpoints.length === 0) {
    throw new Error("Uptime configuration must define at least one endpoint")
  }
  return config
}

function resolveBaseUrl(region) {
  if (region.baseUrlEnv) {
    const envValue = process.env[region.baseUrlEnv]
    if (envValue && envValue.trim().length > 0) {
      return envValue.trim()
    }
  }
  if (region.baseUrl) {
    return region.baseUrl
  }
  return null
}

function normalisePath(endpointPath) {
  if (!endpointPath || typeof endpointPath !== "string") {
    throw new Error("Endpoint path must be a non-empty string")
  }
  return endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`
}

function buildUrl(baseUrl, endpointPath) {
  try {
    const url = new URL(endpointPath, baseUrl)
    return url.toString()
  } catch (error) {
    throw new Error(`Unable to build URL from base '${baseUrl}' and path '${endpointPath}': ${error.message}`)
  }
}

function excerpt(body, length) {
  if (!body || !length) return null
  if (body.length <= length) {
    return body
  }
  return `${body.slice(0, length)}…`
}

async function fetchPreviousFailures(supabase, regionId, endpointPath) {
  const { data, error } = await supabase
    .from("uptime_checks")
    .select("consecutive_failures")
    .eq("region", regionId)
    .eq("endpoint", endpointPath)
    .order("checked_at", { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`Failed to read previous uptime check: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return 0
  }

  return data[0]?.consecutive_failures ?? 0
}

async function recordUptimeCheck({
  supabase,
  region,
  regionLabel,
  endpointPath,
  method,
  url,
  config,
  runId,
  baseUrl,
}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs)
  const startedAt = performance.now()

  let statusCode = null
  let responseText = null
  let success = false
  let errorMessage = null

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "User-Agent": `roomsily-uptime-monitor/${config.version ?? "1"}`,
      },
    })
    const latency = Math.round(performance.now() - startedAt)
    statusCode = response.status
    success = response.ok
    try {
      responseText = await response.text()
    } catch (responseReadError) {
      responseText = null
      if (!success) {
        errorMessage =
          responseReadError instanceof Error
            ? responseReadError.message
            : String(responseReadError)
      }
    }
    clearTimeout(timeout)

    if (!success && !errorMessage) {
      errorMessage = `Request completed with status ${statusCode} ${response.statusText ?? ""}`.trim()
    }

    const previousFailures = await fetchPreviousFailures(
      supabase,
      region,
      endpointPath
    )
    const consecutiveFailures = success ? 0 : previousFailures + 1

    const { error: insertError } = await supabase.from("uptime_checks").insert({
      region,
      region_label: regionLabel,
      endpoint: endpointPath,
      http_method: method,
      full_url: url,
      status_code: statusCode,
      success,
      latency_ms: latency,
      error_message: errorMessage,
      response_excerpt: excerpt(responseText, config.responseExcerptLength),
      consecutive_failures: consecutiveFailures,
      config_version: config.version ?? 1,
      metadata: {
        runId,
        baseUrl,
        requestTimeoutMs: config.requestTimeoutMs,
        configVersion: config.version ?? 1,
      },
    })

    if (insertError) {
      throw new Error(`Failed to store uptime check: ${insertError.message}`)
    }

    return {
      success,
      statusCode,
      latency,
      errorMessage,
      consecutiveFailures,
    }
  } catch (error) {
    clearTimeout(timeout)
    const latency = Math.round(performance.now() - startedAt)
    const failureReason =
      error instanceof Error
        ? error.name === "AbortError"
          ? `Request timed out after ${config.requestTimeoutMs}ms`
          : error.message
        : String(error)

    const previousFailures = await fetchPreviousFailures(
      supabase,
      region,
      endpointPath
    ).catch((readError) => {
      throw new Error(`Failed to read previous failures: ${readError.message}`)
    })

    const consecutiveFailures = previousFailures + 1

    const { error: insertError } = await supabase.from("uptime_checks").insert({
      region,
      region_label: regionLabel,
      endpoint: endpointPath,
      http_method: method,
      full_url: url,
      status_code: statusCode,
      success: false,
      latency_ms: latency,
      error_message: failureReason,
      response_excerpt: excerpt(responseText, config.responseExcerptLength),
      consecutive_failures: consecutiveFailures,
      config_version: config.version ?? 1,
      metadata: {
        runId,
        baseUrl,
        requestTimeoutMs: config.requestTimeoutMs,
        configVersion: config.version ?? 1,
      },
    })

    if (insertError) {
      throw new Error(`Failed to store uptime failure: ${insertError.message}`)
    }

    return {
      success: false,
      statusCode,
      latency,
      errorMessage: failureReason,
      consecutiveFailures,
    }
  }
}

async function sendAlert({ regionLabel, endpointPath, statusCode, errorMessage, latency, consecutiveFailures, url }, config) {
  const webhookUrl = process.env.UPTIME_ALERT_WEBHOOK
  const summary = `Uptime degradation detected for ${regionLabel} ${endpointPath} (streak: ${consecutiveFailures}).`
  const payload = {
    text: `${summary}\nURL: ${url}\nStatus: ${statusCode ?? "no-response"}\nLatency: ${latency ?? "n/a"}ms\nError: ${errorMessage ?? "unknown"}`,
  }

  if (!webhookUrl) {
    console.warn(
      `${summary} No UPTIME_ALERT_WEBHOOK configured; recording alert without external notification.`
    )
    return { delivered: false }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const responseBody = await response.text().catch(() => "")
      throw new Error(
        `Webhook responded with ${response.status}: ${response.statusText}. ${responseBody}`.trim()
      )
    }

    console.info(`Alert delivered for ${regionLabel} ${endpointPath}`)
    return { delivered: true }
  } catch (error) {
    console.error(`Failed to deliver alert: ${error instanceof Error ? error.message : String(error)}`)
    return { delivered: false, error }
  }
}

async function main() {
  const config = await loadConfig()
  if (!config.requestTimeoutMs) {
    config.requestTimeoutMs = 10000
  }
  if (!config.responseExcerptLength) {
    config.responseExcerptLength = 256
  }
  if (!config.consecutiveFailureThreshold) {
    config.consecutiveFailureThreshold = 3
  }
  if (typeof config.failWorkflowOnAlert !== "boolean") {
    config.failWorkflowOnAlert = false
  }
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL must be provided for uptime checks")
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be provided for uptime checks")
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })

  const runId = randomUUID()
  const summary = []
  let workflowShouldFail = false

  for (const region of config.regions) {
    const baseUrl = resolveBaseUrl(region)
    const regionLabel = region.label ?? region.id

    if (!baseUrl) {
      console.error(
        `Skipping region '${region.id}' because no base URL was provided via configuration or environment variable.`
      )
      workflowShouldFail = true
      continue
    }

    const endpoints = Array.isArray(region.endpoints) && region.endpoints.length
      ? region.endpoints
      : config.endpoints

    for (const endpoint of endpoints) {
      const endpointPath = normalisePath(endpoint.path)
      const method = (endpoint.method ?? "GET").toUpperCase()
      const url = buildUrl(baseUrl, endpointPath)

      try {
        const result = await recordUptimeCheck({
          supabase,
          region: region.id,
          regionLabel,
          endpointPath,
          method,
          url,
          config,
          runId,
          baseUrl,
        })

        summary.push({
          region: regionLabel,
          endpoint: endpointPath,
          success: result.success,
          statusCode: result.statusCode,
          latency: result.latency,
          consecutiveFailures: result.consecutiveFailures,
        })

        if (
          !result.success &&
          result.consecutiveFailures >= config.consecutiveFailureThreshold
        ) {
          console.warn(
            `Consecutive failure threshold reached for ${regionLabel} ${endpointPath} (streak: ${result.consecutiveFailures}).`
          )
          await sendAlert(
            {
              regionLabel,
              endpointPath,
              statusCode: result.statusCode,
              errorMessage: result.errorMessage,
              latency: result.latency,
              consecutiveFailures: result.consecutiveFailures,
              url,
            },
            config
          )

          if (config.failWorkflowOnAlert) {
            workflowShouldFail = true
          }
        }
      } catch (error) {
        workflowShouldFail = true
        console.error(
          `Failed to record uptime check for ${regionLabel} ${endpointPath}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }

  console.table(
    summary.map((entry) => ({
      Region: entry.region,
      Endpoint: entry.endpoint,
      Status: entry.success ? "ok" : "failed",
      "HTTP": entry.statusCode ?? "-",
      "Latency (ms)": entry.latency ?? "-",
      "Failure Streak": entry.consecutiveFailures,
    }))
  )

  if (workflowShouldFail) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
