export const CACHE_TAGS = {
  DOCUMENTS: "documents",
  PAYMENTS: "payments",
} as const

export const REVALIDATION_WINDOWS = {
  MARKETING: 60 * 60 * 12, // 12 hours for static marketing copy refresh
  DOCUMENTS: 60, // 1 minute to surface new Supabase document mutations
  PAYMENTS: 60, // 1 minute to reflect payment workflow updates
} as const

export const FETCH_CACHE_BEHAVIOR = {
  SUPABASE_MUTATIONS: "force-cache",
} as const
