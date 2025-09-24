import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Tables } from "@/lib/supabase"

export type AuditLogRow = Tables<"audit_logs">

export type AuditLogFilters = {
  search?: string
  actorId?: string
  actorRole?: string
  entityType?: string
  action?: string
  householdId?: string
  startDate?: string
  endDate?: string
}

export type AuditLogFilterFacets = {
  actorRoles: string[]
  actions: string[]
  entityTypes: string[]
}

export type AuditLogQueryWarning = {
  reason:
    | "future_end_date"
    | "date_range_clamped"
    | "limit_clamped"
    | "page_clamped"
  attempted?: unknown
  normalized?: unknown
}

export type AuditLogQueryState = {
  filters: AuditLogFilters
  pagination: {
    limit: number
    page: number
  }
  includeFacets: boolean
  warnings: AuditLogQueryWarning[]
}

export type AuditLogQueryParseResult =
  | { success: true; data: AuditLogQueryState }
  | { success: false; error: z.ZodError | AuditLogDateRangeError }

export class AuditLogDateRangeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuditLogDateRangeError"
  }
}

export class AuditLogFetchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuditLogFetchError"
  }
}

export type AuditLogFetchOptions = {
  includeFacets?: boolean
}

export type AuditLogFetchResult = {
  logs: AuditLogRow[]
  count: number
  limit: number
  page: number
  totalPages: number
  facets?: AuditLogFilterFacets
}

export const AUDIT_LOG_DEFAULT_LIMIT = 25
export const AUDIT_LOG_MAX_LIMIT = 200
export const AUDIT_LOG_MAX_PAGE = 200
export const AUDIT_LOG_DEFAULT_RANGE_DAYS = 30
export const AUDIT_LOG_MAX_RANGE_DAYS = 180

const MS_PER_DAY = 24 * 60 * 60 * 1000

const isoDateParam = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date format. Expected ISO 8601 string.",
  })
  .transform((value) => new Date(value))

const optionalTrimmedString = (maxLength: number, minLength = 1) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) return undefined
      if (typeof value !== "string") return value
      const trimmed = value.trim()
      return trimmed === "" ? undefined : trimmed
    },
    z.string().min(minLength).max(maxLength).optional()
  )

const optionalUuidParam = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return undefined
    if (typeof value !== "string") return value
    const trimmed = value.trim()
    return trimmed === "" ? undefined : trimmed
  },
  z.string().uuid().optional()
)

const booleanParam = z.preprocess((value) => {
  if (value === undefined || value === null) return false
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["", "0", "false", "no", "off"].includes(normalized)) return false
    if (["1", "true", "yes", "on"].includes(normalized)) return true
    return false
  }
  return Boolean(value)
}, z.boolean())

const positiveIntegerParam = (fallback: number, name: string) =>
  z.preprocess(
    (value) => {
      if (value === undefined) return fallback
      if (typeof value === "string") {
        const trimmed = value.trim()
        if (trimmed === "") return Number.NaN
        if (!/^\d+$/.test(trimmed)) return Number.NaN
        return Number.parseInt(trimmed, 10)
      }
      if (typeof value === "number") return value
      return Number.NaN
    },
    z
      .number({ invalid_type_error: `${name} must be a positive integer` })
      .refine((num) => Number.isInteger(num) && num > 0, {
        message: `${name} must be a positive integer`,
      })
  )

const auditLogQuerySchema = z.object({
  search: optionalTrimmedString(120, 2),
  actorId: optionalUuidParam,
  actorRole: optionalTrimmedString(64),
  entityType: optionalTrimmedString(96),
  action: optionalTrimmedString(96),
  householdId: optionalUuidParam,
  startDate: z.preprocess(
    (value) => (value === undefined || value === null ? undefined : value),
    isoDateParam.optional()
  ),
  endDate: z.preprocess(
    (value) => (value === undefined || value === null ? undefined : value),
    isoDateParam.optional()
  ),
  limit: positiveIntegerParam(AUDIT_LOG_DEFAULT_LIMIT, "limit"),
  page: positiveIntegerParam(1, "page"),
  includeFacets: booleanParam,
})

export function parseAuditLogQuery(
  rawParams: Record<string, string | undefined>
): AuditLogQueryParseResult {
  const validation = auditLogQuerySchema.safeParse(rawParams)
  if (!validation.success) {
    return { success: false, error: validation.error }
  }

  const { startDate, endDate, limit, page, includeFacets, ...filters } =
    validation.data

  const warnings: AuditLogQueryWarning[] = []

  const now = new Date()
  let normalizedEndDate = endDate ?? now
  if (normalizedEndDate > now) {
    warnings.push({
      reason: "future_end_date",
      attempted: endDate?.toISOString(),
      normalized: now.toISOString(),
    })
    normalizedEndDate = now
  }

  if (startDate && startDate > normalizedEndDate) {
    return {
      success: false,
      error: new AuditLogDateRangeError(
        "startDate must be before or equal to endDate"
      ),
    }
  }

  let normalizedStartDate =
    startDate ??
    new Date(normalizedEndDate.getTime() - AUDIT_LOG_DEFAULT_RANGE_DAYS * MS_PER_DAY)

  const earliestAllowed = new Date(
    normalizedEndDate.getTime() - AUDIT_LOG_MAX_RANGE_DAYS * MS_PER_DAY
  )

  if (normalizedStartDate < earliestAllowed) {
    warnings.push({
      reason: "date_range_clamped",
      attempted: startDate?.toISOString(),
      normalized: earliestAllowed.toISOString(),
    })
    normalizedStartDate = earliestAllowed
  }

  let sanitizedLimit = limit
  if (sanitizedLimit > AUDIT_LOG_MAX_LIMIT) {
    warnings.push({
      reason: "limit_clamped",
      attempted: limit,
      normalized: AUDIT_LOG_MAX_LIMIT,
    })
    sanitizedLimit = AUDIT_LOG_MAX_LIMIT
  }

  let sanitizedPage = page
  if (sanitizedPage > AUDIT_LOG_MAX_PAGE) {
    warnings.push({
      reason: "page_clamped",
      attempted: page,
      normalized: AUDIT_LOG_MAX_PAGE,
    })
    sanitizedPage = AUDIT_LOG_MAX_PAGE
  }

  return {
    success: true,
    data: {
      filters: {
        ...filters,
        startDate: normalizedStartDate.toISOString(),
        endDate: normalizedEndDate.toISOString(),
      },
      pagination: {
        limit: sanitizedLimit,
        page: sanitizedPage,
      },
      includeFacets,
      warnings,
    },
  }
}

function escapeIlikeTerm(term: string) {
  return term.replace(/[\\%_]/g, (character) => `\\${character}`)
}

function toLikePattern(term: string) {
  return `%${escapeIlikeTerm(term)}%`
}

function parseFacetRow(
  row:
    | {
        actor_roles: string[] | null
        actions: string[] | null
        entity_types: string[] | null
      }
    | undefined
    | null
): AuditLogFilterFacets {
  return {
    actorRoles: row?.actor_roles ?? [],
    actions: row?.actions ?? [],
    entityTypes: row?.entity_types ?? [],
  }
}

export async function fetchAuditLogs(
  supabase: SupabaseClient<Database>,
  filters: AuditLogFilters,
  pagination: { limit: number; page: number },
  options: AuditLogFetchOptions = {}
): Promise<AuditLogFetchResult> {
  const from = (pagination.page - 1) * pagination.limit
  const to = from + pagination.limit - 1

  let query = supabase
    .from("audit_logs")
    .select(
      `
        id,
        created_at,
        actor_id,
        actor_role,
        actor_email,
        actor_name,
        entity_type,
        entity_id,
        entity_name,
        action,
        payload,
        context,
        household_id,
        ip_address,
        user_agent
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })

  if (filters.actorId) {
    query = query.eq("actor_id", filters.actorId)
  }

  if (filters.actorRole) {
    query = query.eq("actor_role", filters.actorRole)
  }

  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType)
  }

  if (filters.action) {
    query = query.eq("action", filters.action)
  }

  if (filters.householdId) {
    query = query.eq("household_id", filters.householdId)
  }

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate)
  }

  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate)
  }

  if (filters.search) {
    const likePattern = toLikePattern(filters.search)
    query = query.or(
      [
        `actor_email.ilike.${likePattern}`,
        `actor_name.ilike.${likePattern}`,
        `entity_type.ilike.${likePattern}`,
        `entity_name.ilike.${likePattern}`,
        `action.ilike.${likePattern}`,
        `entity_id.ilike.${likePattern}`,
      ].join(",")
    )
  }

  const { data, error, count } = await query.range(from, to)

  if (error) {
    throw new AuditLogFetchError(`Failed to fetch audit logs: ${error.message}`)
  }

  const totalCount = count ?? 0
  const totalPages = pagination.limit
    ? Math.max(1, Math.ceil(totalCount / pagination.limit))
    : 1

  let facets: AuditLogFilterFacets | undefined
  if (options.includeFacets) {
    const { data: facetData, error: facetError } =
      await supabase.rpc("get_audit_log_filter_options")
    if (facetError) {
      throw new AuditLogFetchError(
        `Failed to load audit log filter options: ${facetError.message}`
      )
    }

    const facetRow = Array.isArray(facetData) ? facetData[0] : facetData
    facets = parseFacetRow(facetRow)
  }

  return {
    logs: data ?? [],
    count: totalCount,
    limit: pagination.limit,
    page: pagination.page,
    totalPages,
    facets,
  }
}

function sanitizeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "object") {
    try {
      return sanitizeCsvValue(JSON.stringify(value))
    } catch (error) {
      return ""
    }
  }

  const stringValue = String(value).replace(/\r?\n|\r/g, " ")
  if (/[",]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

export function createAuditLogCsv(logs: AuditLogRow[]): string {
  const headers = [
    "Log ID",
    "Timestamp",
    "Actor ID",
    "Actor Name",
    "Actor Email",
    "Actor Role",
    "Action",
    "Entity Type",
    "Entity ID",
    "Entity Name",
    "Household ID",
    "IP Address",
    "User Agent",
    "Payload",
    "Context",
  ]

  const rows = logs.map((log) => [
    log.id,
    log.created_at ? new Date(log.created_at).toISOString() : "",
    log.actor_id ?? "",
    log.actor_name ?? (log.actor_email ? "" : "System"),
    log.actor_email ?? "",
    log.actor_role ?? "",
    log.action,
    log.entity_type,
    log.entity_id ?? "",
    log.entity_name ?? "",
    log.household_id ?? "",
    log.ip_address ?? "",
    log.user_agent ?? "",
    log.payload,
    log.context ?? {},
  ])

  return [headers, ...rows]
    .map((cells) => cells.map(sanitizeCsvValue).join(","))
    .join("\n")
}

export function buildAppliedFilters(filters: AuditLogFilters) {
  const entries: Array<{ key: string; value: string }> = []

  if (filters.actorRole) {
    entries.push({ key: "actorRole", value: filters.actorRole })
  }

  if (filters.action) {
    entries.push({ key: "action", value: filters.action })
  }

  if (filters.entityType) {
    entries.push({ key: "entityType", value: filters.entityType })
  }

  if (filters.search) {
    entries.push({ key: "search", value: filters.search })
  }

  if (filters.householdId) {
    entries.push({ key: "householdId", value: filters.householdId })
  }

  if (filters.actorId) {
    entries.push({ key: "actorId", value: filters.actorId })
  }

  if (filters.startDate && filters.endDate) {
    entries.push({
      key: "dateRange",
      value: `${filters.startDate} – ${filters.endDate}`,
    })
  }

  return entries
}
