const FALLBACK_SUPABASE_URL = "https://placeholder.supabase.co"
const FALLBACK_SUPABASE_ANON_KEY = "placeholder-anon-key"

function readSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
}

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
}

export function getSupabaseAnonKey() {
  return readSupabasePublicKey() || FALLBACK_SUPABASE_ANON_KEY
}

export function hasSupabasePublicEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && readSupabasePublicKey())
}
