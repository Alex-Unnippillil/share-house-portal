import 'server-only'

export type DependencyStatus = 'healthy' | 'degraded' | 'down'

export type DependencyHealth = {
  name: 'supabase' | 'stripe' | 'calcom' | 'documenso'
  status: DependencyStatus
  message: string
}


const PROBE_TIMEOUT_MS = 2_000
const HEALTH_CACHE_TTL_MS = 15_000

let cachedDependencyHealth: { value: DependencyHealth[]; expiresAt: number } | null = null

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function classifyStatusCode(statusCode: number): DependencyStatus {
  if (statusCode >= 200 && statusCode < 300) {
    return 'healthy'
  }

  if (statusCode === 401 || statusCode === 403) {
    return 'degraded'
  }

  if (statusCode >= 500 || statusCode === 429) {
    return 'degraded'
  }

  return 'down'
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = PROBE_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: 'no-store',
    })
  } finally {
    clearTimeout(timeout)
  }
}

function classifyFetchFailure(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { status: 'down' as const, reason: `timed out after ${PROBE_TIMEOUT_MS}ms` }
  }

  return { status: 'down' as const, reason: 'network error' }
}

async function runProbe(
  name: DependencyHealth['name'],
  envNames: string[],
  buildRequest: () => { url: string; options: RequestInit }
): Promise<DependencyHealth> {
  const missing = envNames.filter((envName) => !process.env[envName])
  if (missing.length > 0) {
    return {
      name,
      status: 'degraded',
      message: `Missing environment variables: ${missing.join(', ')}`,
    }
  }

  try {
    const { url, options } = buildRequest()
    const response = await fetchWithTimeout(url, options)
    const status = classifyStatusCode(response.status)

    let outcome = 'probe succeeded'
    if (status === 'degraded') {
      outcome = response.status === 401 || response.status === 403 ? 'authentication failed' : 'partial outage'
    } else if (status === 'down') {
      outcome = 'probe failed'
    }

    return {
      name,
      status,
      message: `${outcome}; response status=${response.status}`,
    }
  } catch (error) {
    const failure = classifyFetchFailure(error)
    return {
      name,
      status: failure.status,
      message: `probe failed; ${failure.reason}`,
    }
  }
}

async function probeSupabase(): Promise<DependencyHealth> {
  return runProbe('supabase', ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], () => {
    const baseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    return {
      url: `${baseUrl}/rest/v1/profiles?select=id&limit=1`,
      options: {
        method: 'GET',
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
      },
    }
  })
}

async function probeStripe(): Promise<DependencyHealth> {
  return runProbe('stripe', ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], () => ({
    url: 'https://api.stripe.com/v1/account',
    options: {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY!}`,
      },
    },
  }))
}

async function probeCalcom(): Promise<DependencyHealth> {
  return runProbe('calcom', ['CALCOM_BASE_URL', 'CALCOM_API_KEY'], () => ({
    url: `${normalizeBaseUrl(process.env.CALCOM_BASE_URL!)}/v2/me`,
    options: {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.CALCOM_API_KEY!}`,
      },
    },
  }))
}

async function probeDocumenso(): Promise<DependencyHealth> {
  return runProbe('documenso', ['DOCUMENSO_BASE_URL', 'DOCUMENSO_API_KEY'], () => ({
    url: `${normalizeBaseUrl(process.env.DOCUMENSO_BASE_URL!)}/api/v1/health`,
    options: {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.DOCUMENSO_API_KEY!}`,
      },
    },
  }))
}

export async function getDependencyHealth(): Promise<DependencyHealth[]> {
  if (cachedDependencyHealth && cachedDependencyHealth.expiresAt > Date.now()) {
    return cachedDependencyHealth.value
  }

  const value = await Promise.all([probeSupabase(), probeStripe(), probeCalcom(), probeDocumenso()])
  cachedDependencyHealth = {
    value,
    expiresAt: Date.now() + HEALTH_CACHE_TTL_MS,
  }

  return value
}

export function clearDependencyHealthCacheForTests() {
  cachedDependencyHealth = null
}

export async function getReadinessSummary() {
  const dependencies = await getDependencyHealth()
  const hasDown = dependencies.some((dependency) => dependency.status === 'down')
  const hasDegraded = dependencies.some((dependency) => dependency.status === 'degraded')

  return {
    status: hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy',
    dependencies,
  }
}
