import { describe, expectTypeOf, it } from 'vitest'

import type { Database } from '@/lib/supabase'

describe('database schema', () => {
  it('amenity_bookings rows are scoped by building', () => {
    expectTypeOf<Database['public']['Tables']['amenity_bookings']['Row']['building_id']>().toEqualTypeOf<string>()
    expectTypeOf<Database['public']['Tables']['amenity_bookings']['Insert']['building_id']>().toEqualTypeOf<string>()
  })

  it('documents enforce building scope', () => {
    expectTypeOf<Database['public']['Tables']['documents']['Insert']['building_id']>().toEqualTypeOf<string>()
  })

  it('messages include message body', () => {
    expectTypeOf<Database['public']['Tables']['messages']['Row']['body']>().toEqualTypeOf<string>()
  })

  it('user_role enum includes platform administrator', () => {
    const role: Database['public']['Enums']['user_role'] = 'platform_admin'
    expectTypeOf(role).toEqualTypeOf<Database['public']['Enums']['user_role']>()
  })
})
