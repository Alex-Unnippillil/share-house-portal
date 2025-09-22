import { getSupabaseServiceRoleClient } from '@/lib/supabase'

const supabase = getSupabaseServiceRoleClient()

// Access auth admin api
export const adminAuthClient = supabase.auth.admin