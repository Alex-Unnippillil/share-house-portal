import type { Database } from './supabase'

export type HouseRule = Database['public']['Tables']['house_rules']['Row']

export function sortHouseRulesByVersion(rules: HouseRule[]): HouseRule[] {
  return [...rules].sort((a, b) => {
    if (a.version !== b.version) {
      return b.version - a.version
    }

    const timeA = Date.parse(a.published_at)
    const timeB = Date.parse(b.published_at)

    if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
      return 0
    }

    return timeB - timeA
  })
}

export function getLatestHouseRule(rules: HouseRule[]): HouseRule | null {
  if (rules.length === 0) {
    return null
  }

  return sortHouseRulesByVersion(rules)[0] ?? null
}
