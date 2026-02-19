const FALLBACK_SUPABASE_URL = "https://placeholder.supabase.co"
const FALLBACK_SUPABASE_ANON_KEY = "placeholder-anon-key"

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY
}

