import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

import { getSupabaseServiceRoleConfig } from '@/utils/supabase/env'

const { url, serviceRoleKey } = getSupabaseServiceRoleConfig()

const supabase = createClient<Database>(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Access auth admin api
export const adminAuthClient = supabase.auth.admin
