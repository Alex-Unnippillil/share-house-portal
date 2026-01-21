import type { Session } from "@supabase/supabase-js"

export type AutoSaveCallback = () => Promise<unknown> | unknown

export interface SessionTimeoutSettings {
  idleThresholdMs: number
  warningWindowMs: number
}

export interface SessionStatusInput {
  expiresAtMs: number | null
  lastActivityMs: number
  nowMs: number
  settings: SessionTimeoutSettings
}

export interface SessionStatus {
  msUntilExpiry: number | null
  msUntilIdleLogout: number
  shouldWarn: boolean
}

const DEFAULT_IDLE_THRESHOLD_MS = 30 * 60 * 1000
const DEFAULT_WARNING_WINDOW_MS = 5 * 60 * 1000

const SECOND_KEYS = [
  "session_idle_timeout_seconds",
  "session_idle_timeout",
  "session_idle_limit_seconds",
  "session_idle_limit",
  "sessionIdleTimeoutSeconds",
  "sessionIdleSeconds",
  "idle_timeout_seconds",
  "idleTimeoutSeconds",
  "idle_seconds",
  "idleSeconds",
]

const MINUTE_KEYS = [
  "session_idle_timeout_minutes",
  "session_idle_timeout_mins",
  "session_idle_minutes",
  "sessionIdleTimeoutMinutes",
  "sessionIdleMinutes",
  "idle_timeout_minutes",
  "idle_minutes",
  "idleTimeoutMinutes",
]

const WARNING_SECOND_KEYS = [
  "session_idle_warning_seconds",
  "session_warning_seconds",
  "session_idle_warning",
  "sessionIdleWarningSeconds",
  "warning_seconds",
  "idle_warning_seconds",
]

const WARNING_MINUTE_KEYS = [
  "session_idle_warning_minutes",
  "session_idle_warning_mins",
  "sessionWarningMinutes",
  "warning_minutes",
  "idle_warning_minutes",
]

const NESTED_METADATA_KEYS = [
  "session_idle",
  "sessionIdle",
  "session_settings",
  "sessionSettings",
  "session",
]

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number.parseFloat(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function pickDurationFromSources(
  sources: Array<Record<string, unknown>>,
  secondKeys: string[],
  minuteKeys: string[],
  fallbackMs: number,
) {
  for (const source of sources) {
    for (const key of secondKeys) {
      const candidate = parseNumeric(source[key])
      if (candidate !== null) {
        return Math.max(candidate, 0) * 1000
      }
    }

    for (const key of minuteKeys) {
      const candidate = parseNumeric(source[key])
      if (candidate !== null) {
        return Math.max(candidate, 0) * 60 * 1000
      }
    }
  }

  return fallbackMs
}

function collectMetadataSources(session: Session | null) {
  const sources: Array<Record<string, unknown>> = []
  const metadata = session?.user?.user_metadata

  if (metadata && typeof metadata === "object") {
    sources.push(metadata as Record<string, unknown>)

    for (const key of NESTED_METADATA_KEYS) {
      const candidate = metadata[key]
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
        sources.push(candidate as Record<string, unknown>)
      }
    }
  }

  return sources
}

export function resolveSessionTimeoutSettings(session: Session | null): SessionTimeoutSettings {
  const sources = collectMetadataSources(session)

  const idleThresholdMs = pickDurationFromSources(
    sources,
    SECOND_KEYS,
    MINUTE_KEYS,
    DEFAULT_IDLE_THRESHOLD_MS,
  )

  const warningWindowMs = pickDurationFromSources(
    sources,
    WARNING_SECOND_KEYS,
    WARNING_MINUTE_KEYS,
    DEFAULT_WARNING_WINDOW_MS,
  )

  const safeWarningWindow = Math.min(Math.max(warningWindowMs, 30 * 1000), idleThresholdMs)

  return {
    idleThresholdMs,
    warningWindowMs: safeWarningWindow,
  }
}

export function calculateSessionStatus({
  expiresAtMs,
  lastActivityMs,
  nowMs,
  settings,
}: SessionStatusInput): SessionStatus {
  const msUntilExpiry =
    typeof expiresAtMs === "number" ? Math.max(expiresAtMs - nowMs, 0) : null
  const msSinceActivity = Math.max(nowMs - lastActivityMs, 0)
  const msUntilIdleLogout = Math.max(settings.idleThresholdMs - msSinceActivity, 0)

  const warnDueToIdle = msUntilIdleLogout <= settings.warningWindowMs && settings.warningWindowMs > 0
  const warnDueToExpiry =
    msUntilExpiry !== null && msUntilExpiry <= settings.warningWindowMs && settings.warningWindowMs > 0

  return {
    msUntilExpiry,
    msUntilIdleLogout,
    shouldWarn: (warnDueToIdle || warnDueToExpiry) && msSinceActivity > 0,
  }
}

export async function extendSessionWithAutoSave<T>(
  callbacks: Iterable<AutoSaveCallback>,
  refreshSession: () => Promise<T>,
): Promise<T> {
  const autoSaveTasks = Array.from(callbacks, (callback) => {
    try {
      return Promise.resolve(callback())
    } catch (error) {
      return Promise.reject(error)
    }
  })

  await Promise.allSettled(autoSaveTasks)

  return refreshSession()
}

export function toSeconds(ms: number | null) {
  if (typeof ms !== "number" || Number.isNaN(ms)) {
    return null
  }

  return Math.max(Math.floor(ms / 1000), 0)
}

export const __internal = {
  parseNumeric,
  collectMetadataSources,
  pickDurationFromSources,
}
