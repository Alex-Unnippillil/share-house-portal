import type { Metadata } from "next"

import {
  AUDIT_LOG_DEFAULT_LIMIT,
  AuditLogDateRangeError,
  type AuditLogQueryState,
  buildAppliedFilters,
  fetchAuditLogs,
  parseAuditLogQuery,
} from "@/lib/audit-logs"
import { createSupbaseServerClient } from "@/utils/supaone"

import { AuditLogsPageClient } from "./audit-log-client"
import { exportAuditLogsCsvAction } from "./actions"

type AuditLogsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export const metadata: Metadata = {
  title: "Audit logs",
  description: "Review privileged activity across the household portal.",
}

function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined
) {
  const normalized: Record<string, string | undefined> = {}

  if (!searchParams) {
    return normalized
  }

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      normalized[key] = value[0]
    } else if (typeof value === "string") {
      normalized[key] = value
    }
  }

  return normalized
}

function ensureQueryState(result: ReturnType<typeof parseAuditLogQuery>): {
  state: AuditLogQueryState
  errorMessage: string | null
} {
  if (result.success) {
    return { state: result.data, errorMessage: null }
  }

  const fallback = parseAuditLogQuery({})
  if (!fallback.success) {
    throw new Error("Failed to compute audit log query state")
  }

  const errorMessage =
    result.error instanceof AuditLogDateRangeError
      ? result.error.message
      : "Some filters were invalid and have been reset."

  return { state: fallback.data, errorMessage }
}

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  const normalizedParams = normalizeSearchParams(searchParams)
  const parseResult = parseAuditLogQuery(normalizedParams)
  const { state: queryState, errorMessage } = ensureQueryState(parseResult)

  const supabase = await createSupbaseServerClient()
  const result = await fetchAuditLogs(
    supabase,
    queryState.filters,
    queryState.pagination,
    { includeFacets: true }
  )

  return (
    <AuditLogsPageClient
      logs={result.logs}
      filters={queryState.filters}
      pagination={{
        count: result.count,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      }}
      facets={result.facets ?? { actorRoles: [], actions: [], entityTypes: [] }}
      warnings={queryState.warnings}
      appliedFilters={buildAppliedFilters(queryState.filters)}
      defaultLimit={AUDIT_LOG_DEFAULT_LIMIT}
      queryError={errorMessage}
      exportAction={exportAuditLogsCsvAction}
    />
  )
}
