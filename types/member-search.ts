export const MEMBER_SEARCH_UNASSIGNED_TOKEN = '__unassigned__'

export type MemberFacet = {
  value: string
  label: string
  count: number
}

export type MemberSearchHit = {
  id: string
  fullName: string | null
  email: string | null
  role: string | null
  unitId: string | null
  highlight: string | null
  rank: number | null
}

export type MemberSearchResponse = {
  query: string
  hits: MemberSearchHit[]
  facets: {
    role: MemberFacet[]
    unit: MemberFacet[]
  }
  meta: {
    tookMs: number
    budgetMs: number
    resultCount: number
  }
}
