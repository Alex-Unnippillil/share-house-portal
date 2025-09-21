import { describe, expectTypeOf, it } from 'vitest'
import type { Database } from '../../lib/supabase'

type Tables = Database['public']['Tables']

type BuildingScopedTables = {
  [Key in keyof Tables]: 'building_id' extends keyof Tables[Key]['Row'] ? Key : never
}[keyof Tables]

describe('supabase schema', () => {
  it('exposes required building scoped tables', () => {
    const scopedTables: BuildingScopedTables[] = [
      'amenities',
      'amenity_bookings',
      'documents',
      'leases',
      'maintenance_requests',
      'messages',
      'rent_payments',
      'threads',
      'units',
      'user_roles',
      'visitor_logs',
    ]

    expectTypeOf<(typeof scopedTables)[number]>().toEqualTypeOf<BuildingScopedTables>()
  })

  it('enforces building_id as non-nullable string on core tables', () => {
    expectTypeOf<Tables['amenities']['Row']['building_id']>().toEqualTypeOf<string>()
    expectTypeOf<Tables['leases']['Row']['building_id']>().toEqualTypeOf<string>()
    expectTypeOf<Tables['rent_payments']['Row']['building_id']>().toEqualTypeOf<string>()
    expectTypeOf<Tables['maintenance_requests']['Row']['building_id']>().toEqualTypeOf<string>()
  })

  it('includes tenancy-aware helper functions', () => {
    expectTypeOf<
      Database['public']['Functions']['has_building_role']['Args']['target_building']
    >().toEqualTypeOf<string>()

    expectTypeOf<
      Database['public']['Functions']['has_building_role']['Args']['allowed_roles']
    >().toEqualTypeOf<Database['public']['Enums']['user_role_type'][] | null | undefined>()

    expectTypeOf<
      Database['public']['Functions']['has_shared_building']['Returns']
    >().toEqualTypeOf<boolean>()
  })

  it('tracks all role enum values', () => {
    expectTypeOf<Database['public']['Enums']['user_role_type']>().toEqualTypeOf<
      | 'platform_admin'
      | 'property_manager'
      | 'building_staff'
      | 'resident'
      | 'support_agent'
    >()
  })
})
