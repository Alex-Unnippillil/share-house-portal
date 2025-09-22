import { beforeEach, describe, expect, it } from 'vitest'

import { getSupabaseServerClient, getSupabaseServerClientTrace } from '@/utils/supabase/server'

describe('supabase server client singleton', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key'

    const globalAny = globalThis as Record<string, unknown>
    delete globalAny.supabaseServerClient
    delete globalAny.supabaseServerInstrumentation
  })

  it('reuses the same instance across successive calls', () => {
    const first = getSupabaseServerClient()
    const second = getSupabaseServerClient()

    expect(second).toBe(first)

    const trace = getSupabaseServerClientTrace()
    console.log('Supabase server client trace:', trace)
    expect(trace.initCount).toBe(1)
    expect(trace.lastInitializedAt).toBeTypeOf('number')
  })
})
