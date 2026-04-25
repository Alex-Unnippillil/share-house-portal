export const CANONICAL_ROLES = ['tenant', 'roommate', 'property_manager', 'admin'] as const
export type AppRole = (typeof CANONICAL_ROLES)[number]

export const LEGACY_ROLE_MIGRATION_MAP = {
  user: 'tenant',
} as const

export type LegacyAppRole = keyof typeof LEGACY_ROLE_MIGRATION_MAP
export type KnownAppRole = AppRole | LegacyAppRole

export function isCanonicalRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (CANONICAL_ROLES as readonly string[]).includes(value)
}

export function migrateLegacyRole(value: unknown): AppRole | null {
  if (typeof value !== 'string') {
    return null
  }

  if (isCanonicalRole(value)) {
    return value
  }

  if (value in LEGACY_ROLE_MIGRATION_MAP) {
    return LEGACY_ROLE_MIGRATION_MAP[value as LegacyAppRole]
  }

  return null
}
