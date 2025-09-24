import "server-only"

type SystemStressLevel = "normal" | "elevated" | "critical"

export type LoadMetricSnapshot = {
cpuUtilization: number
memoryUtilization: number
p95LatencyMs: number
eventLoopLagMs: number
errorRate: number
dbConnectionUtilization: number
}

export type SystemStress = {
level: SystemStressLevel
stressScore: number
reasons: string[]
active: boolean
}

type FeatureFlagDefinition = {
envKey?: string
default: boolean
evaluate?: (context: FeatureFlagEvaluationContext) => boolean
}

type FeatureFlagEvaluationContext = {
metrics: LoadMetricSnapshot
stress: SystemStress
}

const FEATURE_FLAG_DEFINITIONS = {
brownoutMode: {
default: false,
envKey: "NEXT_PUBLIC_FEATURE_BROWNOUT_MODE",
evaluate: ({ stress }) => stress.active,
},
streamingDashboards: {
default: true,
envKey: "NEXT_PUBLIC_FEATURE_STREAMING_DASHBOARDS",
evaluate: ({ stress }) => !stress.active && stress.level === "normal",
},
dashboardMetrics: {
default: true,
envKey: "NEXT_PUBLIC_FEATURE_DASHBOARD_METRICS",
evaluate: ({ stress }) => !stress.active && stress.level !== "critical",
},
quickActions: {
default: true,
envKey: "NEXT_PUBLIC_FEATURE_QUICK_ACTIONS",
evaluate: ({ stress }) => !stress.active && stress.stressScore < 3,
},
} satisfies Record<string, FeatureFlagDefinition>

export type FeatureFlag = keyof typeof FEATURE_FLAG_DEFINITIONS

type FeatureFlagEvaluation = {
metrics: LoadMetricSnapshot
stress: SystemStress
flags: Record<FeatureFlag, boolean>
}

const FEATURE_FLAG_CACHE_SYMBOL = Symbol.for("share-house-portal.feature-flags")

function isTruthy(value: string | undefined) {
if (!value) {
return false
}
return ["1", "true", "on", "enabled", "yes"].includes(value.toLowerCase())
}

function clampPercentage(value: number) {
if (Number.isNaN(value)) {
return 0
}
if (value > 1) {
// Accept percentages expressed from 0-100
return Math.min(Math.max(value / 100, 0), 1)
}
return Math.min(Math.max(value, 0), 1)
}

function readPercentageEnv(key: string, fallback: number) {
const rawValue = process.env[key]
if (!rawValue) {
return clampPercentage(fallback)
}
const parsed = Number.parseFloat(rawValue)
if (!Number.isFinite(parsed)) {
return clampPercentage(fallback)
}
return clampPercentage(parsed)
}

function readNumericEnv(key: string, fallback: number) {
const rawValue = process.env[key]
if (!rawValue) {
return fallback
}
const parsed = Number.parseFloat(rawValue)
if (!Number.isFinite(parsed)) {
return fallback
}
return parsed
}

function gatherLoadMetrics(overrides?: Partial<LoadMetricSnapshot>): LoadMetricSnapshot {
return {
cpuUtilization:
overrides?.cpuUtilization ?? readPercentageEnv("SYSTEM_CPU_UTILIZATION", 0.42),
memoryUtilization:
overrides?.memoryUtilization ?? readPercentageEnv("SYSTEM_MEMORY_UTILIZATION", 0.56),
p95LatencyMs: overrides?.p95LatencyMs ?? readNumericEnv("SYSTEM_P95_LATENCY_MS", 620),
eventLoopLagMs:
overrides?.eventLoopLagMs ?? readNumericEnv("SYSTEM_EVENT_LOOP_LAG_MS", 28),
errorRate: overrides?.errorRate ?? readPercentageEnv("SYSTEM_ERROR_RATE", 0.012),
dbConnectionUtilization:
overrides?.dbConnectionUtilization ?? readPercentageEnv("SYSTEM_DB_CONNECTION_UTILIZATION", 0.33),
}
}

type StressSignal = {
reason: string
severity: Exclude<SystemStressLevel, "normal">
weight: number
}

function detectSystemStress(metrics: LoadMetricSnapshot): SystemStress {
const signals: StressSignal[] = []

if (metrics.cpuUtilization >= 0.92) {
signals.push({
reason: "CPU utilisation above 92%",
severity: "critical",
weight: 2.6,
})
} else if (metrics.cpuUtilization >= 0.78) {
signals.push({
reason: "CPU utilisation sustained above 78%",
severity: "elevated",
weight: 1.4,
})
}

if (metrics.memoryUtilization >= 0.94) {
signals.push({
reason: "Memory pressure above 94%",
severity: "critical",
weight: 2.4,
})
} else if (metrics.memoryUtilization >= 0.82) {
signals.push({
reason: "Memory utilisation above 82%",
severity: "elevated",
weight: 1.2,
})
}

if (metrics.p95LatencyMs >= 1500) {
signals.push({
reason: "p95 request latency beyond 1.5s",
severity: "critical",
weight: 2.8,
})
} else if (metrics.p95LatencyMs >= 950) {
signals.push({
reason: "p95 request latency above 950ms",
severity: "elevated",
weight: 1.5,
})
}

if (metrics.eventLoopLagMs >= 250) {
signals.push({
reason: "Node.js event loop lag above 250ms",
severity: "critical",
weight: 2.2,
})
} else if (metrics.eventLoopLagMs >= 120) {
signals.push({
reason: "Node.js event loop lag above 120ms",
severity: "elevated",
weight: 1.3,
})
}

if (metrics.errorRate >= 0.08) {
signals.push({
reason: "Error rate spiking above 8%",
severity: "critical",
weight: 2.5,
})
} else if (metrics.errorRate >= 0.035) {
signals.push({
reason: "Error rate above 3.5%",
severity: "elevated",
weight: 1.1,
})
}

if (metrics.dbConnectionUtilization >= 0.9) {
signals.push({
reason: "Database connections above 90% utilisation",
severity: "critical",
weight: 2.0,
})
} else if (metrics.dbConnectionUtilization >= 0.75) {
signals.push({
reason: "Database connection pool above 75%",
severity: "elevated",
weight: 1.0,
})
}

const hasCritical = signals.some((signal) => signal.severity === "critical")
const highestSeverity: SystemStressLevel = hasCritical
? "critical"
: signals.length > 0
  ? "elevated"
  : "normal"
const stressScore = signals.reduce((score, signal) => score + signal.weight, 0)
const activateBrownout =
hasCritical || stressScore >= 3 || (signals.length >= 2 && highestSeverity !== "normal")

return {
level: highestSeverity,
stressScore,
reasons: signals.map((signal) => signal.reason),
active: activateBrownout,
}
}

function computeFeatureEvaluation(
metricsOverride?: Partial<LoadMetricSnapshot>,
): FeatureFlagEvaluation {
const metrics = gatherLoadMetrics(metricsOverride)
const stress = detectSystemStress(metrics)
const flags = {} as Record<FeatureFlag, boolean>

for (const [key, definition] of Object.entries(FEATURE_FLAG_DEFINITIONS)) {
const flag = key as FeatureFlag
const envOverride = definition.envKey
? process.env[definition.envKey]
: undefined
if (envOverride !== undefined) {
flags[flag] = isTruthy(envOverride)
continue
}

if (definition.evaluate) {
flags[flag] = definition.evaluate({ metrics, stress })
continue
}

flags[flag] = definition.default
}

return { metrics, stress, flags }
}

type GlobalWithCache = typeof globalThis & {
[FEATURE_FLAG_CACHE_SYMBOL]?: FeatureFlagEvaluation
}

function getGlobalCache(): GlobalWithCache {
return globalThis as GlobalWithCache
}

export function resetFeatureFlagCache() {
const globalCache = getGlobalCache()
delete globalCache[FEATURE_FLAG_CACHE_SYMBOL]
}

export function evaluateFeatureFlags(options: {
metrics?: Partial<LoadMetricSnapshot>
} = {}) {
if (options.metrics) {
return computeFeatureEvaluation(options.metrics)
}

const globalCache = getGlobalCache()
if (!globalCache[FEATURE_FLAG_CACHE_SYMBOL]) {
globalCache[FEATURE_FLAG_CACHE_SYMBOL] = computeFeatureEvaluation()
}

return globalCache[FEATURE_FLAG_CACHE_SYMBOL]!
}

export function isFeatureEnabled(flag: FeatureFlag) {
const evaluation = evaluateFeatureFlags()
return evaluation.flags[flag]
}
