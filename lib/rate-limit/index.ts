const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR

export type PlanFeature =
  | 'documents'
  | 'amenity_bookings'
  | 'messages'

export type PlanCode = 'starter' | 'growth' | 'scale'

export const PLAN_FEATURES: PlanFeature[] = [
  'documents',
  'amenity_bookings',
  'messages',
]

export const PLAN_CODES: PlanCode[] = ['starter', 'growth', 'scale']

export interface PlanQuotaConfig {
  /**
   * Total number of allowed requests in the window. Use `null` to represent an
   * unlimited quota for a feature.
   */
  limit: number | null
  /** Number of seconds in the rolling window for the quota. */
  windowSeconds: number
  /** Human-readable summary of the quota for dashboard display. */
  summary: string
}

export interface PlanDefinition {
  code: PlanCode
  name: string
  description: string
  upgradeUrl: string
  quotas: Record<PlanFeature, PlanQuotaConfig>
}

export const DEFAULT_PLAN_CODE: PlanCode = 'starter'

export const PLAN_DEFINITIONS: Record<PlanCode, PlanDefinition> = {
  starter: {
    code: 'starter',
    name: 'Starter',
    description:
      'For a single household exploring shared amenity scheduling and rent workflows.',
    upgradeUrl: 'https://roomsily.app/pricing?plan=starter',
    quotas: {
      documents: {
        limit: 120,
        windowSeconds: SECONDS_PER_DAY,
        summary: 'Document API requests per rolling day',
      },
      amenity_bookings: {
        limit: 240,
        windowSeconds: SECONDS_PER_DAY,
        summary: 'Amenity booking writes per rolling day',
      },
      messages: {
        limit: 600,
        windowSeconds: SECONDS_PER_HOUR,
        summary: 'Message board posts per rolling hour',
      },
    },
  },
  growth: {
    code: 'growth',
    name: 'Growth',
    description:
      'Ideal for multi-building operators coordinating payments, docs, and amenity traffic.',
    upgradeUrl: 'https://roomsily.app/pricing?plan=growth',
    quotas: {
      documents: {
        limit: 800,
        windowSeconds: SECONDS_PER_DAY,
        summary: 'Document API requests per rolling day',
      },
      amenity_bookings: {
        limit: 1200,
        windowSeconds: SECONDS_PER_DAY,
        summary: 'Amenity booking writes per rolling day',
      },
      messages: {
        limit: 3200,
        windowSeconds: SECONDS_PER_HOUR,
        summary: 'Message board posts per rolling hour',
      },
    },
  },
  scale: {
    code: 'scale',
    name: 'Scale',
    description:
      'For enterprise property operators requiring elastic messaging and document workflows.',
    upgradeUrl: 'https://roomsily.app/contact/sales',
    quotas: {
      documents: {
        limit: null,
        windowSeconds: SECONDS_PER_DAY,
        summary: 'Document API requests with unlimited quota',
      },
      amenity_bookings: {
        limit: 5000,
        windowSeconds: SECONDS_PER_DAY,
        summary: 'Amenity booking writes per rolling day',
      },
      messages: {
        limit: null,
        windowSeconds: SECONDS_PER_HOUR,
        summary: 'Message board posts with unlimited quota',
      },
    },
  },
}

export const FEATURE_METADATA: Record<PlanFeature, { title: string; description: string }> = {
  documents: {
    title: 'Documents API',
    description:
      'Tracks calls to document retrieval and signing endpoints leveraged by Documenso.',
  },
  amenity_bookings: {
    title: 'Amenity bookings',
    description:
      'Counts calendar mutations synced with Cal.com for household amenity usage.',
  },
  messages: {
    title: 'Roommate board',
    description:
      'Monitors realtime feed posts and comment fan-out for shared units.',
  },
}

export interface RateLimitRule {
  id: string
  feature: PlanFeature
  matcher: RegExp
  methods?: readonly string[]
}

export const RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    id: 'documents-api',
    feature: 'documents',
    matcher: /^\/api\/documents/,
    methods: ['GET', 'POST', 'PATCH'],
  },
  {
    id: 'amenities-api',
    feature: 'amenity_bookings',
    matcher: /^\/api\/(amenities|bookings)/,
    methods: ['GET', 'POST'],
  },
  {
    id: 'messages-api',
    feature: 'messages',
    matcher: /^\/api\/(messages|threads)/,
    methods: ['GET', 'POST'],
  },
]

export type TenantPlanOverrides = Partial<
  Record<PlanFeature, { limit?: number | null; windowSeconds?: number }>
>

export interface TenantPlanRecord {
  tenant_id: string
  plan_code: PlanCode
  overrides: TenantPlanOverrides | null
}

export interface ResolvedPlanQuota extends PlanQuotaConfig {
  feature: PlanFeature
  planCode: PlanCode
}

export function resolveQuotaForTenant(
  planCode: PlanCode,
  feature: PlanFeature,
  overrides?: TenantPlanOverrides | null
): ResolvedPlanQuota | null {
  const plan = PLAN_DEFINITIONS[planCode] ?? PLAN_DEFINITIONS[DEFAULT_PLAN_CODE]
  const baseQuota = plan.quotas[feature]

  if (!baseQuota) {
    return null
  }

  const override = overrides?.[feature]
  const hasLimitOverride =
    override !== undefined && override !== null &&
    Object.prototype.hasOwnProperty.call(override, 'limit')
  const limit = hasLimitOverride
    ? override!.limit === null
      ? null
      : typeof override!.limit === 'number' && Number.isFinite(override!.limit)
        ? override!.limit
        : baseQuota.limit
    : baseQuota.limit

  const hasWindowOverride =
    override !== undefined && override !== null &&
    Object.prototype.hasOwnProperty.call(override, 'windowSeconds')
  const windowSeconds = hasWindowOverride
    ? typeof override!.windowSeconds === 'number' &&
      Number.isFinite(override!.windowSeconds)
      ? override!.windowSeconds
      : baseQuota.windowSeconds
    : baseQuota.windowSeconds

  return {
    ...baseQuota,
    feature,
    planCode,
    limit,
    windowSeconds,
  }
}

export function parseTenantOverrides(value: unknown): TenantPlanOverrides | null {
  if (!value) {
    return null
  }

  let raw: unknown = value
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value)
    } catch {
      return null
    }
  }

  if (!raw || typeof raw !== 'object') {
    return null
  }

  const overrides: TenantPlanOverrides = {}

  for (const feature of PLAN_FEATURES) {
    const entry = (raw as Record<string, unknown>)[feature]
    if (!entry || typeof entry !== 'object') {
      continue
    }

    const limitValue = (entry as Record<string, unknown>).limit
    const windowValue =
      (entry as Record<string, unknown>).windowSeconds ??
      (entry as Record<string, unknown>).window_seconds

    const normalized: { limit?: number | null; windowSeconds?: number } = {}

    if (limitValue === null) {
      normalized.limit = null
    } else if (typeof limitValue === 'number') {
      if (Number.isFinite(limitValue)) {
        normalized.limit = limitValue
      }
    } else if (typeof limitValue === 'string' && limitValue.trim().length > 0) {
      const parsed = Number(limitValue)
      if (Number.isFinite(parsed)) {
        normalized.limit = parsed
      }
    }

    if (typeof windowValue === 'number') {
      if (Number.isFinite(windowValue)) {
        normalized.windowSeconds = windowValue
      }
    } else if (typeof windowValue === 'string' && windowValue.trim().length > 0) {
      const parsed = Number(windowValue)
      if (Number.isFinite(parsed)) {
        normalized.windowSeconds = parsed
      }
    }

    if (Object.keys(normalized).length > 0) {
      overrides[feature] = normalized
    }
  }

  return Object.keys(overrides).length > 0 ? overrides : null
}

export function formatQuotaLimit(limit: number | null | undefined): string {
  if (limit === null) {
    return 'Unlimited'
  }

  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    return '—'
  }

  return limit.toLocaleString('en-US')
}

export function formatQuotaWindow(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return 'N/A'
  }

  if (seconds % SECONDS_PER_DAY === 0) {
    const days = seconds / SECONDS_PER_DAY
    return `${days} day${days === 1 ? '' : 's'}`
  }

  if (seconds % SECONDS_PER_HOUR === 0) {
    const hours = seconds / SECONDS_PER_HOUR
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }

  if (seconds % SECONDS_PER_MINUTE === 0) {
    const minutes = seconds / SECONDS_PER_MINUTE
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }

  return `${seconds} seconds`
}
