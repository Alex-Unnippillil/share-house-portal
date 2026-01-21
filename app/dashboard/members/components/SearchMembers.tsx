'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMemberRoleLabel } from '@/config/roles'
import { cn } from '@/lib/utils'
import {
  MEMBER_SEARCH_UNASSIGNED_TOKEN,
  type MemberFacet,
  type MemberSearchHit,
  type MemberSearchResponse,
} from '@/types/member-search'

const DEBOUNCE_DELAY_MS = 250
const DEFAULT_LIMIT = 12
const EMPTY_RESPONSE: MemberSearchResponse = {
  query: '',
  hits: [],
  facets: { role: [], unit: [] },
  meta: { tookMs: 0, budgetMs: 150, resultCount: 0 },
}

const latencyFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
})

function formatUnitLabel(value: string | null | undefined): string {
  if (!value || value === MEMBER_SEARCH_UNASSIGNED_TOKEN) {
    return 'Unassigned'
  }
  return value
}

function ensureSelectedFacets(
  facets: MemberFacet[],
  selectedValues: string[],
  fallbackLabel: (value: string) => string
): MemberFacet[] {
  if (!selectedValues.length) return facets

  const existingValues = new Set(facets.map((facet) => facet.value))
  const selectedExtras: MemberFacet[] = []

  for (const value of selectedValues) {
    if (!existingValues.has(value)) {
      selectedExtras.push({ value, label: fallbackLabel(value), count: 0 })
    }
  }

  return [...selectedExtras, ...facets]
}

function Highlight({ hit }: { hit: MemberSearchHit }) {
  if (hit.highlight) {
    return (
      <div
        className="text-sm text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: hit.highlight }}
      />
    )
  }

  const fallback = [hit.fullName, hit.email].filter(Boolean).join(' · ')
  return (
    <div className="text-sm text-muted-foreground">
      {fallback || 'No additional context available'}
    </div>
  )
}

function FacetPill({
  facet,
  isActive,
  onToggle,
}: {
  facet: MemberFacet
  isActive: boolean
  onToggle: (value: string) => void
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={isActive ? 'default' : 'outline'}
      aria-pressed={isActive}
      onClick={() => onToggle(facet.value)}
      className={cn(
        'rounded-full px-3 py-1 text-xs',
        isActive ? 'shadow-sm' : 'bg-background'
      )}
    >
      <span>{facet.label}</span>
      <span className="ml-1 text-muted-foreground">({facet.count})</span>
    </Button>
  )
}

export default function SearchMembers() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedUnits, setSelectedUnits] = useState<string[]>([])
  const [response, setResponse] = useState<MemberSearchResponse>(EMPTY_RESPONSE)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, DEBOUNCE_DELAY_MS)

    return () => clearTimeout(handle)
  }, [query])

  const fetchMembers = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const params = new URLSearchParams()
    if (debouncedQuery) {
      params.set('q', debouncedQuery)
    }
    if (selectedRoles.length) {
      for (const role of selectedRoles) {
        params.append('role', role)
      }
    }
    if (selectedUnits.length) {
      for (const unit of selectedUnits) {
        params.append('unit', unit)
      }
    }
    params.set('limit', DEFAULT_LIMIT.toString())

    setIsLoading(true)
    setError(null)

    fetch(`/api/search/members?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          let message = 'Unable to complete the search.'
          try {
            const payload = await res.json()
            if (payload && typeof payload.error === 'string') {
              message = payload.error
            }
          } catch {
            // ignore JSON parse errors and use default message
          }
          throw new Error(message)
        }

        return res.json() as Promise<MemberSearchResponse>
      })
      .then((payload) => {
        if (controller.signal.aborted) return
        setResponse(payload)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Unexpected error while searching for members.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })
  }, [debouncedQuery, selectedRoles, selectedUnits])

  useEffect(() => {
    fetchMembers()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchMembers])

  const mergedRoleFacets = useMemo(
    () =>
      ensureSelectedFacets(response.facets.role, selectedRoles, (value) =>
        getMemberRoleLabel(value)
      ),
    [response.facets.role, selectedRoles]
  )

  const mergedUnitFacets = useMemo(
    () =>
      ensureSelectedFacets(response.facets.unit, selectedUnits, (value) =>
        formatUnitLabel(value)
      ),
    [response.facets.unit, selectedUnits]
  )

  const toggleRole = (value: string) => {
    setSelectedRoles((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    )
  }

  const toggleUnit = (value: string) => {
    setSelectedUnits((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    )
  }

  const clearFilters = () => {
    setSelectedRoles([])
    setSelectedUnits([])
  }

  const isLatencyOverBudget =
    response.meta.tookMs > 0 && response.meta.tookMs > response.meta.budgetMs

  return (
    <div className="flex-1">
      <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search members by name, email, role, or unit"
              aria-label="Search members"
            />
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {isLoading
                ? 'Searching…'
                : `${response.meta.resultCount} result${
                    response.meta.resultCount === 1 ? '' : 's'
                  }`}
            </span>
            <span
              className={cn(
                'font-medium',
                isLatencyOverBudget
                  ? 'text-destructive'
                  : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {latencyFormatter.format(response.meta.tookMs)} ms
            </span>
            <span className="text-xs">budget ≤ {response.meta.budgetMs} ms</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {mergedRoleFacets.map((facet) => (
              <FacetPill
                key={`role:${facet.value}`}
                facet={facet}
                isActive={selectedRoles.includes(facet.value)}
                onToggle={toggleRole}
              />
            ))}
            {mergedUnitFacets.map((facet) => (
              <FacetPill
                key={`unit:${facet.value}`}
                facet={{
                  ...facet,
                  label: formatUnitLabel(facet.value),
                }}
                isActive={selectedUnits.includes(facet.value)}
                onToggle={toggleUnit}
              />
            ))}
          </div>
          {(selectedRoles.length > 0 || selectedUnits.length > 0) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-3"
            >
              Clear filters
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <ul className="space-y-3">
          {response.hits.length === 0 && !isLoading ? (
            <li className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              {debouncedQuery
                ? 'No members matched this search yet.'
                : 'No members available yet. Try adjusting your filters.'}
            </li>
          ) : (
            response.hits.map((hit) => (
              <li key={hit.id} className="rounded-md border bg-background p-4 shadow-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {hit.fullName || 'Unnamed member'}
                    </p>
                    <Highlight hit={hit} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{getMemberRoleLabel(hit.role)}</Badge>
                    <Badge variant="secondary">
                      {formatUnitLabel(hit.unitId ?? MEMBER_SEARCH_UNASSIGNED_TOKEN)}
                    </Badge>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
