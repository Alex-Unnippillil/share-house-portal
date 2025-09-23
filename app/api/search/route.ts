import { NextResponse } from "next/server"
import { performance } from "node:perf_hooks"

import { searchPortal, type SearchRequest } from "@/lib/search/client"

type SearchPayload = {
  query?: string
  scope?: string
  filters?: Record<string, string | string[]>
  limit?: number
  typoTolerance?: "min" | "strict" | "false"
}

const normalizeFilters = (
  filters: SearchPayload["filters"]
): Record<string, string[]> => {
  if (!filters) {
    return {}
  }

  return Object.entries(filters).reduce<Record<string, string[]>>(
    (acc, [key, value]) => {
      if (value === undefined || value === null) {
        return acc
      }

      const normalized = Array.isArray(value)
        ? value
        : String(value)
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)

      if (normalized.length) {
        acc[key] = normalized
      }

      return acc
    },
    {}
  )
}

const logSearchMetric = (payload: {
  query: string
  scope?: string
  serviceLatency: number
  totalDuration: number
  hitCount: number
}) => {
  const entry = {
    event: "search_query",
    queryLength: payload.query.length,
    scope: payload.scope ?? "global",
    serviceLatency: payload.serviceLatency,
    totalDuration: payload.totalDuration,
    hitCount: payload.hitCount,
    timestamp: new Date().toISOString(),
  }

  console.info("portal.search", entry)
}

export async function POST(request: Request) {
  let payload: SearchPayload
  try {
    payload = (await request.json()) as SearchPayload
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    )
  }

  const query = typeof payload.query === "string" ? payload.query : ""
  const scope = typeof payload.scope === "string" ? payload.scope : undefined
  const filters = normalizeFilters(payload.filters)
  const limit = typeof payload.limit === "number" ? payload.limit : undefined
  const typoTolerance = payload.typoTolerance

  if (!query && Object.keys(filters).length === 0) {
    return NextResponse.json(
      { error: "Query or filters must be provided" },
      { status: 400 }
    )
  }

  const startedAt = performance.now()

  const requestOptions: SearchRequest = {
    query,
    scope,
    filters,
    limit,
    typoTolerance,
  }

  try {
    const result = await searchPortal(requestOptions)
    const totalDuration = Math.round(performance.now() - startedAt)

    logSearchMetric({
      query,
      scope,
      serviceLatency: result.processingTimeMS,
      totalDuration,
      hitCount: result.hits.length,
    })

    return NextResponse.json(
      {
        query: result.query,
        hits: result.hits,
        facets: result.facets,
        processingTimeMS: result.processingTimeMS,
        totalDurationMS: totalDuration,
        appliedFilters: result.appliedFilters,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("portal.search.error", error)
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 502 }
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") ?? ""
  const scope = searchParams.get("scope") ?? undefined
  const limitParam = searchParams.get("limit")
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined
  const typoTolerance =
    (searchParams.get("typoTolerance") as SearchRequest["typoTolerance"]) ?? "min"

  const filters: Record<string, string[]> = {}
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("facet.")) {
      const facetKey = key.replace(/^facet\./, "")
      filters[facetKey] = value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    }
  }

  if (!query && Object.keys(filters).length === 0) {
    return NextResponse.json(
      { error: "Query or filters must be provided" },
      { status: 400 }
    )
  }

  const startedAt = performance.now()

  try {
    const result = await searchPortal({
      query,
      scope,
      filters,
      limit,
      typoTolerance,
    })
    const totalDuration = Math.round(performance.now() - startedAt)

    logSearchMetric({
      query,
      scope,
      serviceLatency: result.processingTimeMS,
      totalDuration,
      hitCount: result.hits.length,
    })

    return NextResponse.json(
      {
        query: result.query,
        hits: result.hits,
        facets: result.facets,
        processingTimeMS: result.processingTimeMS,
        totalDurationMS: totalDuration,
        appliedFilters: result.appliedFilters,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("portal.search.error", error)
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 502 }
    )
  }
}
