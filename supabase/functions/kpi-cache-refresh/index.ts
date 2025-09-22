import { createClient } from 'https://deno.land/x/supabase@1.7.7/mod.ts'

const KPI_CACHE_KEY = 'dashboard'
const KPI_CACHE_SCOPE = 'global'
const CACHE_TTL_MS = 15 * 60 * 1000

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  const incomingSecret = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (cronSecret && incomingSecret !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const message = 'Missing Supabase credentials for KPI cache refresh.'
    await notifyFailure(message)
    return response({ ok: false, message }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })

  const startedAt = performance.now()
  const computedAt = new Date().toISOString()
  let metrics: Record<string, unknown> | null = null

  try {
    const { data, error } = await supabase.rpc('calculate_dashboard_kpis')
    if (error) {
      throw new Error(error.message)
    }

    metrics = data as Record<string, unknown> | null
    const payload = { ...(metrics ?? {}), computedAt }

    const { error: upsertError } = await supabase
      .from('kpi_cache')
      .upsert(
        {
          key: KPI_CACHE_KEY,
          scope: KPI_CACHE_SCOPE,
          payload,
          computed_at: computedAt,
          expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
          compute_duration_ms: Math.round(performance.now() - startedAt),
          source: 'edge_function',
          error: null,
        },
        { onConflict: 'key', returning: 'minimal' }
      )

    if (upsertError) {
      throw new Error(upsertError.message)
    }

    return response({ ok: true, source: 'edge_function', computeDurationMs: Math.round(performance.now() - startedAt) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown KPI cache failure'
    await supabase
      .from('kpi_cache')
      .upsert(
        {
          key: KPI_CACHE_KEY,
          scope: KPI_CACHE_SCOPE,
          payload: metrics ?? {},
          computed_at: computedAt,
          expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
          compute_duration_ms: Math.round(performance.now() - startedAt),
          source: 'edge_function',
          error: message,
        },
        { onConflict: 'key', returning: 'minimal' }
      )
      .catch(() => undefined)

    await notifyFailure(message)

    return response({ ok: false, message }, 500)
  }
})

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

async function notifyFailure(message: string) {
  const webhook = Deno.env.get('KPI_CACHE_ALERT_WEBHOOK')
  if (!webhook) return

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: `KPI cache refresh failed: ${message}` }),
    })
  } catch (error) {
    console.error('Failed to send KPI cache alert', error)
  }
}
