import { Pool } from 'pg'

import {
  getPoolerSslConfig,
  getPoolerThresholdsFromEnv,
  getSupabasePoolerUrl,
} from '@/lib/supabase'

export type ConnectionSaturationLevel = 'warning' | 'critical'

export interface ConnectionSaturationThresholds {
  warning: number
  critical: number
}

export interface ConnectionPoolStats {
  database: string
  user: string
  activeClients: number
  waitingClients: number
  totalClients: number
  serverActive: number
  serverIdle: number
  maxClientConnections: number
  poolMode: string
  maxWaitMs: number
  saturation: number
  serverUtilization: number
}

export interface ConnectionSaturationAlert {
  level: ConnectionSaturationLevel
  database: string
  threshold: number
  saturation: number
  stats: ConnectionPoolStats
  message: string
}

export interface MonitorConnectionOptions {
  thresholds?: Partial<ConnectionSaturationThresholds>
  onAlert?: (alert: ConnectionSaturationAlert) => Promise<void> | void
  logger?: (alert: ConnectionSaturationAlert) => void
}

export interface ConnectionSaturationAnalysis {
  stats: ConnectionPoolStats[]
  alerts: ConnectionSaturationAlert[]
  thresholds: ConnectionSaturationThresholds
}

type MonitoringGlobalState = {
  __supabasePgbouncerPool?: Pool
}

const globalForMonitoring = globalThis as typeof globalThis & MonitoringGlobalState

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0)

  if (!Number.isFinite(parsed)) {
    return 0
  }

  return parsed
}

const clamp01 = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(Math.max(value, 0), 1)
}

const resolveThresholds = (
  overrides: Partial<ConnectionSaturationThresholds> = {}
): ConnectionSaturationThresholds => {
  const envThresholds = getPoolerThresholdsFromEnv()
  const warning = clamp01(
    overrides.warning ?? envThresholds.warning,
    envThresholds.warning
  )
  const critical = clamp01(
    overrides.critical ?? envThresholds.critical,
    envThresholds.critical
  )

  return {
    warning,
    critical: Math.max(warning, critical),
  }
}

const formatMessage = (stat: ConnectionPoolStats) => {
  const parts = [
    `${stat.database} pool at ${(stat.saturation * 100).toFixed(1)}% capacity`,
    `${stat.activeClients}/${stat.maxClientConnections} active clients`,
  ]

  if (stat.waitingClients > 0) {
    parts.push(`${stat.waitingClients} waiting`)
  }

  if (stat.maxWaitMs > 0) {
    parts.push(`max wait ${(stat.maxWaitMs / 1000).toFixed(1)}s`)
  }

  parts.push(`mode ${stat.poolMode}`)

  return parts.join(' · ')
}

const mapPoolRow = (row: Record<string, unknown>): ConnectionPoolStats => {
  const activeClients = toNumber(row.cl_active)
  const waitingClients = toNumber(row.cl_waiting)
  const totalClients = activeClients + waitingClients
  const serverActive = toNumber(row.sv_active)
  const serverIdle = toNumber(row.sv_idle)
  const maxClientConnections = Math.max(
    toNumber(row.max_client_conn),
    totalClients
  )
  const maxWaitSeconds = toNumber(row.maxwait)
  const saturation =
    maxClientConnections > 0 ? totalClients / maxClientConnections : 0
  const serverTotal = serverActive + serverIdle
  const serverUtilization = serverTotal > 0 ? serverActive / serverTotal : 0

  return {
    database: String(row.database ?? 'unknown'),
    user: String(row.user ?? 'unknown'),
    activeClients,
    waitingClients,
    totalClients,
    serverActive,
    serverIdle,
    maxClientConnections,
    poolMode: String(row.pool_mode ?? 'session'),
    maxWaitMs: Math.max(0, Math.round(maxWaitSeconds * 1000)),
    saturation,
    serverUtilization,
  }
}

const createPool = () =>
  new Pool({
    connectionString: getSupabasePoolerUrl(),
    ssl: getPoolerSslConfig(),
    max: 2,
    min: 0,
    idleTimeoutMillis: 0,
    allowExitOnIdle: true,
  })

const getPool = () => {
  if (!globalForMonitoring.__supabasePgbouncerPool) {
    globalForMonitoring.__supabasePgbouncerPool = createPool()
  }

  return globalForMonitoring.__supabasePgbouncerPool
}

export const fetchConnectionPoolStats = async () => {
  const client = await getPool().connect()

  try {
    const result = await client.query('SHOW POOLS;')
    return result.rows.map(mapPoolRow)
  } finally {
    client.release()
  }
}

const evaluateStat = (
  stat: ConnectionPoolStats,
  thresholds: ConnectionSaturationThresholds
): ConnectionSaturationAlert | null => {
  let level: ConnectionSaturationLevel | null = null
  let threshold = thresholds.warning

  if (stat.saturation >= thresholds.critical) {
    level = 'critical'
    threshold = thresholds.critical
  } else if (stat.saturation >= thresholds.warning) {
    level = 'warning'
    threshold = thresholds.warning
  } else if (stat.waitingClients > 0) {
    level = 'warning'
    threshold = thresholds.warning
  }

  if (!level) {
    return null
  }

  return {
    level,
    database: stat.database,
    threshold,
    saturation: stat.saturation,
    stats: stat,
    message: formatMessage(stat),
  }
}

export const analyzeConnectionSaturation = async (
  overrides: Partial<ConnectionSaturationThresholds> = {}
): Promise<ConnectionSaturationAnalysis> => {
  const thresholds = resolveThresholds(overrides)
  const stats = await fetchConnectionPoolStats()
  const alerts = stats
    .map((stat) => evaluateStat(stat, thresholds))
    .filter((alert): alert is ConnectionSaturationAlert => Boolean(alert))

  return {
    stats,
    alerts,
    thresholds,
  }
}

export const monitorConnectionPool = async (
  options: MonitorConnectionOptions = {}
): Promise<ConnectionSaturationAnalysis> => {
  const analysis = await analyzeConnectionSaturation(options.thresholds)

  if (analysis.alerts.length > 0) {
    for (const alert of analysis.alerts) {
      if (options.logger) {
        options.logger(alert)
      } else {
        console.warn('[supabase:pool]', alert.message)
      }

      if (options.onAlert) {
        await options.onAlert(alert)
      }
    }
  }

  return analysis
}

export const resetConnectionMonitoring = async () => {
  if (!globalForMonitoring.__supabasePgbouncerPool) {
    return
  }

  const pool = globalForMonitoring.__supabasePgbouncerPool
  globalForMonitoring.__supabasePgbouncerPool = undefined

  await pool.end()
}

declare global {
  // eslint-disable-next-line no-var
  var __supabasePgbouncerPool: Pool | undefined
}
