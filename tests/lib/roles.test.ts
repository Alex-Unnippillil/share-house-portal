import { describe, expect, it } from 'vitest'

import {
  CANONICAL_ROLES,
  isCanonicalRole,
  migrateLegacyRole,
} from '@/lib/roles'

describe('roles helpers', () => {
  it('exposes canonical portal roles', () => {
    expect(CANONICAL_ROLES).toEqual(['tenant', 'roommate', 'property_manager', 'admin'])
  })

  it('recognizes canonical roles only', () => {
    expect(isCanonicalRole('tenant')).toBe(true)
    expect(isCanonicalRole('user')).toBe(false)
    expect(isCanonicalRole('unknown')).toBe(false)
  })

  it('maps legacy roles through explicit migration path', () => {
    expect(migrateLegacyRole('user')).toBe('tenant')
    expect(migrateLegacyRole('admin')).toBe('admin')
    expect(migrateLegacyRole('unknown')).toBeNull()
  })
})
