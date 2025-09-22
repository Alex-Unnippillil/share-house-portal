import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'

import { getSupabaseServerClient } from './supabase/server'

export function createClient(): SupabaseClient<Database> {
  return getSupabaseServerClient()
}

export { getSupabaseServerClient }
