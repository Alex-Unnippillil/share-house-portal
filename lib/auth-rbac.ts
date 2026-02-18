import type { SupabaseClient, User } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'

export const APP_ROLES = ['tenant', 'roommate', 'property_manager', 'admin', 'user'] as const
export type AppRole = (typeof APP_ROLES)[number]

export const PUBLIC_ROUTE_PREFIXES = ['/auth', '/about', '/contact', '/error']
export const PUBLIC_EXACT_ROUTES = ['/', '/favicon.ico']

const AUTHENTICATED_ROUTE_PREFIXES = [
  '/dashboard',
  '/payments',
  '/documents',
  '/bookings',
  '/messaging',
  '/maintenance',
  '/schedule',
  '/account',
  '/private',
]

const ROLE_ROUTE_RULES: Array<{ prefix: string; allowed: AppRole[] }> = [
  { prefix: '/dashboard/members', allowed: ['property_manager', 'admin'] },
]

function coerceRole(value: unknown): AppRole | null {
  if (typeof value !== 'string') {
    return null
  }

  return (APP_ROLES as readonly string[]).includes(value) ? (value as AppRole) : null
}

export async function resolveSessionRole(
  supabase: SupabaseClient<Database>,
  user: User | null
): Promise<AppRole | null> {
  if (!user) {
    return null
  }

  const claimedRole =
    coerceRole(user.app_metadata?.role) ??
    coerceRole(user.user_metadata?.role) ??
    coerceRole((user as User & { role?: unknown }).role)

  if (claimedRole && claimedRole !== 'user') {
    return claimedRole
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Failed to resolve profile role in middleware:', error.message)
    return claimedRole
  }

  return coerceRole(data?.role) ?? claimedRole
}

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT_ROUTES.includes(pathname)) {
    return true
  }

  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function requiresAuthentication(pathname: string): boolean {
  return AUTHENTICATED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function isRouteAllowedForRole(pathname: string, role: AppRole | null): boolean {
  const rule = ROLE_ROUTE_RULES.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)
  )

  if (!rule) {
    return true
  }

  if (!role) {
    return false
  }

  return rule.allowed.includes(role)
}
