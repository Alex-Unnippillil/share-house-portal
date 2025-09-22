export const DEFAULT_DYNAMIC = 'force-dynamic' as const
export const DEFAULT_REVALIDATE = 0 as const

export const POLICY_PAGE_REVALIDATE_SECONDS = 60 * 60 * 24 // 24 hours
export const PRODUCT_MARKETING_REVALIDATE_SECONDS = 60 * 60 // 1 hour

export const ISR_TAGS = {
  marketingPolicies: 'marketing:policies',
  productMarketing: 'marketing:product-experience',
} as const

export const STATIC_ROUTES = ['/about', '/privacy', '/terms'] as const
export const SEMI_STATIC_ROUTES = ['/payments', '/messaging', '/maintenance', '/visitors'] as const

export type CacheTag = typeof ISR_TAGS[keyof typeof ISR_TAGS]
