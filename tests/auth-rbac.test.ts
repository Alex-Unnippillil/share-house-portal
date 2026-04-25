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
    expect(requiresAuthentication('/chores')).toBe(true)
    expect(requiresAuthentication('/supplies')).toBe(true)
    expect(requiresAuthentication('/about')).toBe(false)
    expect(requiresAuthentication('/terms')).toBe(false)
  })

  it('enforces role restrictions for manager pages', () => {
    expect(isRouteAllowedForRole('/dashboard/members', 'admin')).toBe(true)
    expect(isRouteAllowedForRole('/dashboard/members', 'property_manager')).toBe(true)
    expect(isRouteAllowedForRole('/dashboard/members', 'tenant')).toBe(false)
    expect(isRouteAllowedForRole('/dashboard', 'tenant')).toBe(true)
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
