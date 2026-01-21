import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import {
  type AuditLogFetchResult,
  AuditLogDateRangeError,
  AuditLogFetchError,
  buildAppliedFilters,
  fetchAuditLogs,
  parseAuditLogQuery,
} from "@/lib/audit-logs"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"

function mapFacets(result: AuditLogFetchResult | undefined) {
  return result?.facets ?? {
    actorRoles: [],
    actions: [],
    entityTypes: [],
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const rawParams = Object.fromEntries(url.searchParams.entries())
  const parsed = parseAuditLogQuery(rawParams)

  if (!parsed.success) {
    const { error } = parsed

    if (error instanceof AuditLogDateRangeError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: error.flatten(),
      },
      { status: 400 }
    )
  }

  const { filters, pagination, includeFacets, warnings } = parsed.data
  const cookieStore = cookies()
  const supabase = createClient(cookieStore) as SupabaseClient<Database>

  try {
    const result = await fetchAuditLogs(supabase, filters, pagination, {
      includeFacets,
    })

    const responseBody = {
      logs: result.logs,
      meta: {
        count: result.count,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        warnings,
        filters,
        appliedFilters: buildAppliedFilters(filters),
        availableFilters: mapFacets(result),
      },
    }

    return NextResponse.json(responseBody, { status: 200 })
  } catch (error) {
    if (error instanceof AuditLogFetchError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      )
    }

    console.error("Unexpected error loading audit logs", {
      error,
      filters,
      pagination,
    })

    return NextResponse.json(
      {
        error: "Failed to load audit logs",
      },
      { status: 500 }
    )
  }
}
