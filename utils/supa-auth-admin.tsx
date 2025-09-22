import { createClient } from '@supabase/supabase-js'

import { siteConfig } from '@/config/site'
import type { Database } from '@/lib/supabase'

const supabase = createClient<Database>(siteConfig.thirdParty.supabase.baseUrl!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Access auth admin api
export const adminAuthClient = supabase.auth.admin
