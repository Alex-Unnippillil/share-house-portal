import { describe, expect, it, vi } from 'vitest'

import {
  isPublicRoute,
  isRouteAllowedForRole,
  requiresAuthentication,
  resolveSessionRole,
} from '@/lib/auth-rbac'

describe('auth RBAC route helpers', () => {
  it('identifies public routes correctly', () => {
    expect(isPublicRoute('/')).toBe(true)
    expect(isPublicRoute('/auth/signin')).toBe(true)
    expect(isPublicRoute('/dashboard')).toBe(false)
  })

  it('identifies authenticated routes correctly', () => {
    expect(requiresAuthentication('/dashboard')).toBe(true)
    expect(requiresAuthentication('/payments/history')).toBe(true)
    expect(requiresAuthentication('/visitors')).toBe(true)
    expect(requiresAuthentication('/about')).toBe(false)
  })

  it('enforces tenant and roommate access for tenant-facing areas', () => {
    const tenantFacingRoutes = [
      '/dashboard',
      '/payments',
      '/documents',
      '/bookings',
      '/maintenance',
      '/visitors',
      '/messaging',
    ]

    tenantFacingRoutes.forEach((route) => {
      expect(isRouteAllowedForRole(route, 'tenant')).toBe(true)
      expect(isRouteAllowedForRole(route, 'roommate')).toBe(true)
    })
  })

  it('enforces operations route for management roles only', () => {
    expect(isRouteAllowedForRole('/dashboard/operations', 'property_manager')).toBe(true)
    expect(isRouteAllowedForRole('/dashboard/operations', 'admin')).toBe(true)
    expect(isRouteAllowedForRole('/dashboard/operations', 'tenant')).toBe(false)
    expect(isRouteAllowedForRole('/dashboard/operations', 'roommate')).toBe(false)
  })

  it('enforces exports route for admin role only', () => {
    expect(isRouteAllowedForRole('/api/exports', 'admin')).toBe(true)
    expect(isRouteAllowedForRole('/api/exports', 'property_manager')).toBe(false)
    expect(isRouteAllowedForRole('/api/exports', 'tenant')).toBe(false)
    expect(isRouteAllowedForRole('/api/exports', 'roommate')).toBe(false)
  })

  it('enforces positive and negative route access for each role', () => {
    const routeCases: Array<{ pathname: string; allowed: Array<'tenant' | 'roommate' | 'property_manager' | 'admin'> }> = [
      { pathname: '/dashboard', allowed: ['tenant', 'roommate', 'property_manager', 'admin'] },
      { pathname: '/dashboard/operations', allowed: ['property_manager', 'admin'] },
      { pathname: '/payments', allowed: ['tenant', 'roommate', 'property_manager', 'admin'] },
      { pathname: '/documents', allowed: ['tenant', 'roommate', 'property_manager', 'admin'] },
      { pathname: '/bookings', allowed: ['tenant', 'roommate', 'property_manager', 'admin'] },
      { pathname: '/maintenance', allowed: ['tenant', 'roommate', 'property_manager', 'admin'] },
      { pathname: '/visitors', allowed: ['tenant', 'roommate', 'property_manager', 'admin'] },
      { pathname: '/messaging', allowed: ['tenant', 'roommate', 'property_manager', 'admin'] },
      { pathname: '/api/exports', allowed: ['admin'] },
    ]
    const roles: Array<'tenant' | 'roommate' | 'property_manager' | 'admin'> = [
      'tenant',
      'roommate',
      'property_manager',
      'admin',
    ]

    routeCases.forEach(({ pathname, allowed }) => {
      roles.forEach((role) => {
        expect(isRouteAllowedForRole(pathname, role)).toBe(allowed.includes(role))
      })
    })
  })

  it('denies protected routes when no role is present', () => {
    expect(isRouteAllowedForRole('/dashboard', null)).toBe(false)
    expect(isRouteAllowedForRole('/payments/history', null)).toBe(false)
  })

  it('denies unknown authenticated paths by default', () => {
    expect(requiresAuthentication('/private/unlisted')).toBe(true)
    expect(isRouteAllowedForRole('/private/unlisted', 'admin')).toBe(false)
    expect(isRouteAllowedForRole('/private/unlisted', 'tenant')).toBe(false)
  })

  it('allows non-protected paths without explicit allowlist rules', () => {
    expect(isRouteAllowedForRole('/help', null)).toBe(false)
    expect(isRouteAllowedForRole('/help', 'tenant')).toBe(true)
  })
})

describe('resolveSessionRole', () => {
  it('prefers trusted app metadata role', async () => {
    const supabase = {
      from: vi.fn(),
    }

    const role = await resolveSessionRole(supabase as any, {
      app_metadata: { role: 'admin' },
      user_metadata: {},
    } as any)

    expect(role).toBe('admin')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('falls back to profile role lookup', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { role: 'roommate' }, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })

    const role = await resolveSessionRole({ from } as any, {
      id: 'user-1',
      app_metadata: {},
      user_metadata: {},
    } as any)

    expect(role).toBe('roommate')
    expect(from).toHaveBeenCalledWith('profiles')
    expect(select).toHaveBeenCalledWith('role')
    expect(eq).toHaveBeenCalledWith('id', 'user-1')
    expect(maybeSingle).toHaveBeenCalled()
  })
})
