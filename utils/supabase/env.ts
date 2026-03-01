const SUPABASE_PUBLIC_ENV_ERROR_PREFIX = "Missing Supabase public environment variable"

function readSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
}

function assertEnvValue(value: string | undefined, message: string) {
  if (!value) {
    throw new Error(`${SUPABASE_PUBLIC_ENV_ERROR_PREFIX}: ${message}`)
  }

  return value
}

export function getSupabaseUrl() {
  return assertEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Configure NEXT_PUBLIC_SUPABASE_URL.",
  )
}

export function getSupabaseAnonKey() {
  return assertEnvValue(
    readSupabasePublicKey(),
    "Configure NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  )
}

export function hasSupabasePublicEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && readSupabasePublicKey())
}
