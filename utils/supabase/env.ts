const LOCAL_SUPABASE_REST_PORT = "54321"

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

function deriveFromDatabaseUrl(databaseUrl: string): string | undefined {
  try {
    const parsed = new URL(databaseUrl)
    const host = parsed.hostname

    if (!host) {
      return undefined
    }

    if (LOCAL_HOSTS.has(host)) {
      const protocol = parsed.protocol === "https:" ? "https" : "http"

      return `${protocol}://${host}:${LOCAL_SUPABASE_REST_PORT}`
    }

    const dbHostMatch = host.match(/^db\.(.+)$/)

    if (dbHostMatch) {
      return `https://${dbHostMatch[1]}`
    }

    if (host.includes("supabase.")) {
      return `https://${host}`
    }

    return undefined
  } catch (error) {
    return undefined
  }
}

export function resolveSupabaseUrl(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL

  if (databaseUrl) {
    const derived = deriveFromDatabaseUrl(databaseUrl)

    if (derived) {
      return derived
    }
  }

  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || undefined
}

export function resolveSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || undefined
}

export function resolveSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || undefined
}

export function getSupabaseClientConfig(options: { requireAnonKey?: boolean } = {}) {
  const url = resolveSupabaseUrl()
  const anonKey = resolveSupabaseAnonKey()
  const requireAnonKey = options.requireAnonKey ?? true

  if (!url) {
    throw new Error(
      "Supabase URL is not configured. Set DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL."
    )
  }

  if (requireAnonKey && !anonKey) {
    throw new Error(
      "Supabase anon key is not configured. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY."
    )
  }

  return {
    url,
    anonKey: anonKey ?? "",
  }
}

export function getSupabaseServiceRoleConfig() {
  const url = resolveSupabaseUrl()
  const serviceRoleKey = resolveSupabaseServiceRoleKey()

  if (!url) {
    throw new Error(
      "Supabase URL is not configured. Set DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL."
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Supabase service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY."
    )
  }

  return {
    url,
    serviceRoleKey,
  }
}

export function hasSupabaseCredentials() {
  return Boolean(resolveSupabaseUrl() && resolveSupabaseAnonKey())
}
