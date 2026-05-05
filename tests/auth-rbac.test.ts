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

  it('enforces role restrictions for manager pages', () => {
    expect(isRouteAllowedForRole('/dashboard/members', 'admin')).toBe(true)
    expect(isRouteAllowedForRole('/dashboard/members', 'property_manager')).toBe(true)
    expect(isRouteAllowedForRole('/dashboard/members', 'tenant')).toBe(false)
    expect(isRouteAllowedForRole('/dashboard/members', 'user')).toBe(false)
    expect(isRouteAllowedForRole('/dashboard', 'tenant')).toBe(true)
  })
})

describe('resolveSessionRole', () => {
  it('prefers profile role when it conflicts with metadata role', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { role: 'roommate' }, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })

    const role = await resolveSessionRole({ from } as any, {
      id: 'user-1',
      app_metadata: { role: 'admin' },
      user_metadata: {},
    } as any)

    expect(role).toBe('roommate')
  })

  it('returns null when profile is missing even if metadata role exists', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })

    const role = await resolveSessionRole({ from } as any, {
      id: 'user-2',
      app_metadata: { role: 'tenant' },
      user_metadata: {},
    } as any)

    expect(role).toBeNull()
  })

  it('falls back to metadata role when profile lookup errors', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'db timeout' } })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })

    const role = await resolveSessionRole({ from } as any, {
      id: 'user-3',
      app_metadata: { role: 'tenant' },
      user_metadata: {},
    } as any)

    expect(role).toBe('tenant')
  })

  it('ignores unknown metadata roles', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'db timeout' } })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })

    const role = await resolveSessionRole({ from } as any, {
      id: 'user-4',
      app_metadata: { role: 'superadmin' },
      user_metadata: {},
    } as any)

    expect(role).toBeNull()
  })
})
