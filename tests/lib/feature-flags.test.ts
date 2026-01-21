import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  evaluateFeatureFlags,
  isFeatureEnabled,
  resetFeatureFlagCache,
} from "@/lib/feature-flags"

const FLAG_ENV_KEYS = [
  "NEXT_PUBLIC_FEATURE_BROWNOUT_MODE",
  "NEXT_PUBLIC_FEATURE_STREAMING_DASHBOARDS",
  "NEXT_PUBLIC_FEATURE_DASHBOARD_METRICS",
  "NEXT_PUBLIC_FEATURE_QUICK_ACTIONS",
] as const

const ORIGINAL_ENV: Record<(typeof FLAG_ENV_KEYS)[number], string | undefined> = FLAG_ENV_KEYS.reduce(
  (acc, key) => ({
    ...acc,
    [key]: process.env[key],
  }),
  {} as Record<(typeof FLAG_ENV_KEYS)[number], string | undefined>,
)

beforeEach(() => {
  for (const key of FLAG_ENV_KEYS) {
    const original = ORIGINAL_ENV[key]
    if (original === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = original
    }
  }
  resetFeatureFlagCache()
})

afterEach(() => {
  resetFeatureFlagCache()
})

afterAll(() => {
  for (const key of FLAG_ENV_KEYS) {
    const original = ORIGINAL_ENV[key]
    if (original === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = original
    }
  }
})

describe("feature flags", () => {
  it("keeps non-critical features enabled under nominal load", () => {
    const evaluation = evaluateFeatureFlags({
      metrics: {
        cpuUtilization: 0.45,
        memoryUtilization: 0.5,
        p95LatencyMs: 480,
        eventLoopLagMs: 35,
        errorRate: 0.01,
        dbConnectionUtilization: 0.4,
      },
    })

    expect(evaluation.stress.active).toBe(false)
    expect(evaluation.stress.level).toBe("normal")
    expect(evaluation.flags.brownoutMode).toBe(false)
    expect(evaluation.flags.streamingDashboards).toBe(true)
    expect(evaluation.flags.dashboardMetrics).toBe(true)
    expect(evaluation.flags.quickActions).toBe(true)
  })

  it("triggers brownout mode when multiple stressors exceed thresholds", () => {
    const evaluation = evaluateFeatureFlags({
      metrics: {
        cpuUtilization: 0.88,
        memoryUtilization: 0.84,
        p95LatencyMs: 1200,
        eventLoopLagMs: 160,
        errorRate: 0.02,
        dbConnectionUtilization: 0.8,
      },
    })

    expect(evaluation.stress.active).toBe(true)
    expect(evaluation.stress.level).toBe("elevated")
    expect(evaluation.flags.brownoutMode).toBe(true)
    expect(evaluation.flags.streamingDashboards).toBe(false)
    expect(evaluation.flags.dashboardMetrics).toBe(false)
    expect(evaluation.flags.quickActions).toBe(false)
    expect(evaluation.stress.reasons.length).toBeGreaterThanOrEqual(2)
  })

  it("prefers explicit environment overrides", () => {
    process.env.NEXT_PUBLIC_FEATURE_STREAMING_DASHBOARDS = "0"
    process.env.NEXT_PUBLIC_FEATURE_DASHBOARD_METRICS = "1"

    const evaluation = evaluateFeatureFlags({
      metrics: {
        cpuUtilization: 0.9,
        memoryUtilization: 0.9,
        p95LatencyMs: 1600,
        eventLoopLagMs: 260,
        errorRate: 0.09,
        dbConnectionUtilization: 0.92,
      },
    })

    expect(evaluation.flags.streamingDashboards).toBe(false)
    expect(evaluation.flags.dashboardMetrics).toBe(true)

    resetFeatureFlagCache()
    delete process.env.NEXT_PUBLIC_FEATURE_STREAMING_DASHBOARDS
    delete process.env.NEXT_PUBLIC_FEATURE_DASHBOARD_METRICS

    expect(isFeatureEnabled("streamingDashboards")).toBe(true)
  })
})
