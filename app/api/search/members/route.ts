import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { MEMBER_ROLE_LABELS, MEMBER_ROLE_VALUES, type MemberRoleValue } from '@/config/roles'
import type { Database } from '@/lib/supabase'
import {
  MEMBER_SEARCH_LATENCY_BUDGET_MS,
  recordMemberSearchTelemetry,
  type MemberSearchHitSummary,
} from '@/lib/observability/member-search-monitor'
import { createClient } from '@/utils/supa-server-actions'
import {
  MEMBER_SEARCH_UNASSIGNED_TOKEN,
  type MemberFacet,
  type MemberSearchResponse,
} from '@/types/member-search'

const querySchema = z.object({
  q: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().max(120))
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  roles: z
    .array(z.enum(MEMBER_ROLE_VALUES))
    .max(MEMBER_ROLE_VALUES.length)
    .default([]),
  units: z.array(z.string().min(1).max(128)).max(25).default([]),
})

type QueryParams = z.infer<typeof querySchema>

function collectMultiValueParams(
  searchParams: URLSearchParams,
  key: string
): string[] {
  const raw = searchParams.getAll(key)
  const values = new Set<string>()

  for (const entry of raw) {
    const parts = entry
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
    for (const part of parts) {
      values.add(part)
    }
  }

  return Array.from(values)
}

function buildFacets(
  rows: Array<{ facet: string | null; value: string | null; count: number | null }>
): MemberSearchResponse['facets'] {
  const roleFacets: MemberFacet[] = []
  const unitFacets: MemberFacet[] = []

  for (const row of rows) {
    if (!row) continue

    const value = row.value ?? ''
    const count = row.count ?? 0

    if (row.facet === 'role') {
      const label = MEMBER_ROLE_LABELS[value as MemberRoleValue] ?? value || 'Unknown'
      roleFacets.push({ value, label, count })
    } else if (row.facet === 'unit') {
      const label = value === MEMBER_SEARCH_UNASSIGNED_TOKEN ? 'Unassigned' : value
      unitFacets.push({ value, label, count })
    }
  }

  roleFacets.sort((a, b) => b.count - a.count)
  unitFacets.sort((a, b) => b.count - a.count)

  return { role: roleFacets, unit: unitFacets }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const rawParams = {
    q: url.searchParams.get('q') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
    roles: collectMultiValueParams(url.searchParams, 'role'),
    units: collectMultiValueParams(url.searchParams, 'unit'),
  }

  const parsed = querySchema.safeParse(rawParams)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  const params: QueryParams = parsed.data
  const cookieStore = cookies()
  const supabase = createClient(cookieStore) as SupabaseClient<Database>

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchInput = params.q ?? ''
  const roleFilters = params.roles.length > 0 ? params.roles : null
  const unitFilters = params.units.length > 0 ? params.units : null

  const requestStart = performance.now()
  const { data: hits, error: searchError } = await supabase.rpc('search_members', {
    search_input: searchInput,
    role_filters: roleFilters,
    unit_filters: unitFilters,
    result_limit: params.limit,
  })

  if (searchError) {
    console.error('Failed to execute member search', {
      userId: user.id,
      error: searchError.message,
    })

    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }

  const durationMs = Number((performance.now() - requestStart).toFixed(2))
  const normalizedHits = (hits ?? []).filter((hit): hit is NonNullable<typeof hit> => Boolean(hit?.id))
  const sanitizedHits: MemberSearchHitSummary[] = normalizedHits.map((hit) => ({
    id: hit.id ?? null,
    role: hit.role ?? null,
    unit_id: hit.unit_id ?? null,
  }))

  const { data: facetRows, error: facetError } = await supabase.rpc('search_members_facets', {
    search_input: searchInput,
    role_filters: roleFilters,
    unit_filters: unitFilters,
  })

  if (facetError) {
    console.error('Failed to load member search facets', {
      userId: user.id,
      error: facetError.message,
    })
  }

  recordMemberSearchTelemetry({
    query: searchInput,
    durationMs,
    hits: sanitizedHits,
  })

  const responseBody: MemberSearchResponse = {
    query: searchInput,
    hits: normalizedHits.map((hit) => ({
      id: hit.id!,
      fullName: hit.full_name ?? null,
      email: hit.email ?? null,
      role: hit.role ?? null,
      unitId: hit.unit_id ?? null,
      highlight: hit.highlight ?? null,
      rank: hit.rank ?? null,
    })),
    facets: buildFacets(facetRows ?? []),
    meta: {
      tookMs: durationMs,
      budgetMs: MEMBER_SEARCH_LATENCY_BUDGET_MS,
      resultCount: normalizedHits.length,
    },
  }

  return NextResponse.json(responseBody)
}
