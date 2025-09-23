"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { track } from "@vercel/analytics/react"
import { Search, Loader2 } from "lucide-react"

import type { SearchResult } from "@/lib/search/client"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export interface SearchBarProps {
  scope: string
  placeholder?: string
  activeFilters?: Record<string, string[]>
  limit?: number
  debounceMs?: number
  typoTolerance?: "min" | "strict" | "false"
  onResults?: (result: SearchResult) => void
  onLatencyMeasured?: (payload: { query: string; latency: number; totalDuration: number }) => void
  onQueryChange?: (query: string) => void
}

const useDebouncedValue = <T,>(value: T, delay: number) => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebounced(value)
    }, delay)

    return () => {
      window.clearTimeout(handle)
    }
  }, [value, delay])

  return debounced
}

const shouldExecuteSearch = (query: string, filters: Record<string, string[]>): boolean => {
  if (query.trim().length > 0) {
    return true
  }

  return Object.values(filters).some((values) => values.length > 0)
}

const computeP95 = (latencies: number[]): number => {
  if (latencies.length === 0) {
    return 0
  }

  const sorted = [...latencies].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[index]
}

export function SearchBar({
  scope,
  placeholder = "Search",
  activeFilters = {},
  limit = 8,
  debounceMs = 200,
  typoTolerance = "min",
  onResults,
  onLatencyMeasured,
  onQueryChange,
}: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [p95Latency, setP95Latency] = useState(0)
  const samplesRef = useRef<number[]>([])

  const filtersSignature = useMemo(
    () => JSON.stringify(activeFilters ?? {}),
    [activeFilters]
  )
  const debouncedQuery = useDebouncedValue(query, debounceMs)

  const executeSearch = useCallback(
    async (currentQuery: string, filters: Record<string, string[]>) => {
      if (!shouldExecuteSearch(currentQuery, filters)) {
        const emptyResult: SearchResult = {
          query: currentQuery,
          hits: [],
          facets: {},
          processingTimeMS: 0,
          appliedFilters: filters,
        }
        setResult(null)
        setError(null)
        onResults?.(emptyResult)
        samplesRef.current = []
        setP95Latency(0)
        return
      }

      const startedAt = performance.now()

      try {
        setError(null)
        const response = await fetch("/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: currentQuery,
            scope,
            filters,
            limit,
            typoTolerance,
          }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "Search failed" }))
          throw new Error(payload.error ?? "Search service unavailable")
        }

        const payload = (await response.json()) as {
          hits: SearchResult["hits"]
          facets: SearchResult["facets"]
          processingTimeMS: number
          totalDurationMS?: number
          query: string
          appliedFilters: Record<string, string[]>
        }

        const nextResult: SearchResult = {
          query: payload.query,
          hits: payload.hits,
          facets: payload.facets,
          processingTimeMS: payload.processingTimeMS,
          appliedFilters: payload.appliedFilters,
        }

        setResult(nextResult)
        onResults?.(nextResult)

        const totalDuration =
          typeof payload.totalDurationMS === "number"
            ? payload.totalDurationMS
            : Math.round(performance.now() - startedAt)

        const latency = nextResult.processingTimeMS
        samplesRef.current = [...samplesRef.current.slice(-49), latency]
        setP95Latency(computeP95(samplesRef.current))

        onLatencyMeasured?.({
          query: currentQuery,
          latency,
          totalDuration,
        })

        try {
          track("search_query_client", {
            scope,
            latency,
            totalDuration,
            queryLength: currentQuery.length,
            hitCount: nextResult.hits.length,
          })
        } catch (err) {
          console.warn("search instrumentation unavailable", err)
        }
      } catch (err) {
        console.error("client search error", err)
        setError(err instanceof Error ? err.message : "Search failed")
      }
    },
    [limit, onLatencyMeasured, onResults, scope, typoTolerance]
  )

  useEffect(() => {
    const filters = activeFilters ?? {}
    startTransition(() => {
      void executeSearch(debouncedQuery, filters)
    })
  }, [debouncedQuery, executeSearch, filtersSignature])

  const sloStatus = p95Latency > 0 ? (p95Latency <= 150 ? "within" : "breached") : "unknown"

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(event) => {
            const value = event.target.value
            setQuery(value)
            onQueryChange?.(value)
          }}
          placeholder={placeholder}
          className="pl-9"
          aria-label="Search"
        />
        {isPending ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>
            {result
              ? `${result.hits.length} result${result.hits.length === 1 ? "" : "s"} • ${result.processingTimeMS} ms`
              : "Refine by keyword or filters"}
          </span>
          {error ? <span className="text-destructive">{error}</span> : null}
        </div>
        {p95Latency > 0 ? (
          <Badge
            variant={sloStatus === "within" ? "secondary" : "destructive"}
            className="uppercase tracking-wide"
          >
            P95 {p95Latency} ms {sloStatus === "within" ? "≤ 150" : "> 150"}
          </Badge>
        ) : null}
      </div>
    </div>
  )
}
