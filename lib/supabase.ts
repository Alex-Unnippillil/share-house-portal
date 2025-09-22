import {
  createClient as createSupabaseAdminClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from '@supabase/supabase-js'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Helper type for describing a Supabase table while keeping Insert/Update lightweight. */
type SupabaseTable<Row extends Record<string, unknown>> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: never[]
}

export type Database = {
  public: {
    Tables: {
      profiles: SupabaseTable<{
        id: string
        created_at: string | null
        updated_at: string | null
        email: string | null
        full_name: string | null
        username: string | null
        website: string | null
        avatar_url: string | null
        role: 'tenant' | 'roommate' | 'property_manager' | 'admin' | 'user' | null
        unit_id: string | null
        phone: string | null
        language: string | null
        stripe_customer_id: string | null
        rent_share: number | null
        metadata: Json | null
      }>
      documents: SupabaseTable<{
        id: string
        created_at: string | null
        updated_at: string | null
        title: string
        description: string | null
        document_type: 'lease' | 'addendum' | 'insurance' | 'maintenance' | 'other'
        status: 'draft' | 'pending_signature' | 'signed' | 'expired' | 'cancelled'
        file_url: string | null
        documenso_envelope_id: string | null
        documenso_template_id: string | null
        metadata: Json | null
        created_by: string | null
        tenant_id: string | null
        unit_id: string | null
        requires_signature: boolean
        expires_at: string | null
        signed_at: string | null
        version: number | null
        parent_document_id: string | null
      }>
      document_signatures: SupabaseTable<{
        id: string
        created_at: string | null
        updated_at: string | null
        document_id: string
        signer_id: string
        signer_email: string
        signer_name: string | null
        status: 'pending' | 'signed' | 'declined' | 'expired'
        signed_at: string | null
        declined_at: string | null
        decline_reason: string | null
        documenso_signature_id: string | null
        ip_address: string | null
        user_agent: string | null
        signature_data: Json | null
        signing_order: number | null
      }>
      document_access_logs: SupabaseTable<{
        id: string
        created_at: string | null
        document_id: string
        user_id: string
        action: string
        ip_address: string | null
        user_agent: string | null
        metadata: Json | null
      }>
      leases: SupabaseTable<{
        id: string
        document_id: string
        created_at: string | null
        updated_at: string | null
        start_date: string
        end_date: string | null
        rent_amount: number | null
        rent_frequency: string
        security_deposit: number | null
        tenant_ids: string[]
        property_address: string | null
        unit_number: string | null
        landlord_name: string | null
        landlord_email: string | null
        auto_renew: boolean | null
        renewal_notice_days: number | null
        special_terms: string | null
        status: 'active' | 'expired' | 'terminated'
      }>
      rent_payments: SupabaseTable<{
        id: string
        user_id: string
        stripe_payment_intent_id: string | null
        stripe_charge_id: string | null
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        amount: number
        currency: string
        status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'completed'
        payment_method: string | null
        payment_method_type: string | null
        description: string | null
        receipt_url: string | null
        metadata: Json | null
        tenant_id: string | null
        unit_id: string | null
        processed_at: string | null
        billing_period_start: string | null
        billing_period_end: string | null
        created_at: string | null
        updated_at: string | null
      }>
      subscriptions: SupabaseTable<{
        id: string
        user_id: string
        stripe_subscription_id: string | null
        stripe_customer_id: string | null
        status: 'active' | 'canceled' | 'past_due' | 'unpaid'
        current_period_start: string | null
        current_period_end: string | null
        cancel_at_period_end: boolean | null
        amount: number
        currency: string
        interval: 'month' | 'year'
        metadata: Json | null
        created_at: string | null
        updated_at: string | null
      }>
      inquiries: SupabaseTable<{
        id: string
        name: string
        email: string
        message: string
        status: 'new' | 'in_progress' | 'resolved' | 'closed'
        created_at: string | null
        updated_at: string | null
        metadata: Json | null
      }>
      maintenance_requests: SupabaseTable<{
        id: string
        title: string
        description: string
        priority: 'low' | 'normal' | 'high' | 'urgent'
        status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
        category: string | null
        location: string | null
        requested_by: string
        assigned_to: string | null
        unit_id: string | null
        created_at: string | null
        updated_at: string | null
        completed_at: string | null
        notes: string | null
        attachments: Json | null
        metadata: Json | null
      }>
      visitor_logs: SupabaseTable<{
        id: string
        guest_name: string
        guest_email: string
        guest_phone: string | null
        host_id: string
        check_in_date: string
        check_out_date: string
        purpose: string
        emergency_contact: string | null
        special_notes: string | null
        status: 'pending' | 'approved' | 'rejected' | 'completed'
        approved_by: string | null
        approved_at: string | null
        created_at: string | null
        updated_at: string | null
      }>
      notifications: SupabaseTable<{
        id: string
        user_id: string
        title: string
        message: string
        type: 'info' | 'success' | 'warning' | 'error'
        action_url: string | null
        metadata: Json | null
        read: boolean | null
        created_at: string | null
        updated_at: string | null
      }>
      email_notifications: SupabaseTable<{
        id: string
        user_id: string | null
        recipient: string
        subject: string
        template: string
        status: 'sent' | 'failed' | 'pending'
        sent_at: string | null
        error_message: string | null
        metadata: Json | null
      }>
      meetings: SupabaseTable<{
        id: string
        user_id: string
        start_time: string
        end_time: string
        google_event_id: string | null
        summary: string | null
        description: string | null
        google_event_link: string | null
        created_at: string | null
        updated_at: string | null
      }>
      user_tokens: SupabaseTable<{
        id: string
        user_id: string
        refresh_token: string | null
        created_at: string | null
        updated_at: string | null
      }>
      chores: SupabaseTable<{
        id: string
        household_id: string
        title: string
        cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'one_time'
        points: number
        active: boolean
      }>
      households: SupabaseTable<{
        id: string
        name: string
        created_at: string | null
        updated_at: string | null
        metadata: Json | null
      }>
      performance_logs: SupabaseTable<{
        id: string
        created_at: string | null
        source: 'supabase-client' | 'api-middleware'
        key: string
        helper: string | null
        environment: 'server' | 'browser' | 'edge' | 'worker' | null
        duration_ms: number
        threshold: 'p95' | 'p99'
        calculated_p95_ms: number | null
        calculated_p99_ms: number | null
        sample_size: number | null
        status_code: number | null
        metadata: Json | null
      }>
      performance_thresholds: SupabaseTable<{
        id: string
        created_at: string | null
        target: string
        description: string | null
        window_interval: string | null
        max_p95_ms: number | null
        max_p99_ms: number | null
        max_p95_count: number | null
        max_p99_count: number | null
        slack_webhook_secret: string | null
        email_webhook_secret: string | null
        email_recipients: string[] | null
        active: boolean | null
        metadata: Json | null
        last_triggered_at: string | null
      }>
      performance_alerts: SupabaseTable<{
        id: string
        created_at: string | null
        target: string
        window_start: string
        window_end: string
        p95_duration_ms: number | null
        p99_duration_ms: number | null
        p95_breach_count: number | null
        p99_breach_count: number | null
        sample_size: number | null
        notification_status: 'sent' | 'failed' | 'skipped'
        metadata: Json | null
      }>
    }
    Views: Record<string, never>
    Functions: {
      get_unread_notification_count: {
        Args: { user_uuid?: string | null }
        Returns: number
      }
      mark_notifications_read: {
        Args: { notification_ids: string[] }
        Returns: void
      }
      update_updated_at_column: {
        Args: Record<string, never>
        Returns: unknown
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
  storage: {
    Tables: {
      buckets: SupabaseTable<{
        id: string
        name: string
        owner: string | null
        created_at: string | null
        updated_at: string | null
        public: boolean | null
        avif_autodetection: boolean | null
        file_size_limit: number | null
        allowed_mime_types: string[] | null
      }>
      objects: SupabaseTable<{
        id: string
        bucket_id: string | null
        name: string | null
        owner: string | null
        created_at: string | null
        updated_at: string | null
        last_accessed_at: string | null
        metadata: Json | null
        path_tokens: string[] | null
        version: string | null
      }>
      migrations: SupabaseTable<{
        id: number
        name: string
        hash: string
        executed_at: string | null
      }>
    }
    Views: Record<string, never>
    Functions: Record<string, unknown>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']

type PerformanceSource = 'supabase-client' | 'api-middleware'
export type PerformanceEnvironment = 'server' | 'browser' | 'edge' | 'worker'

type PerformanceLogInsert = TablesInsert<'performance_logs'>

type PerformanceSample = {
  key: string
  durationMs: number
  source: PerformanceSource
  environment: PerformanceEnvironment
  helper?: string | null
  statusCode?: number
  metadata?: Record<string, unknown>
}

export type SupabaseInstrumentationConfig = {
  helper: string
  environment: PerformanceEnvironment
  context?: Record<string, unknown>
}

const SAMPLE_WINDOW_SIZE = 200
const MIN_SAMPLE_SIZE_FOR_ALERT = 20

const performanceWindows = new Map<string, number[]>()
let performanceLogClient: SupabaseClient<Database> | null = null
const globalFetch: typeof fetch | undefined =
  typeof fetch === 'function' ? fetch.bind(globalThis) : undefined

function schedule(task: () => void | Promise<void>) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => {
      void task()
    })
  } else {
    void Promise.resolve().then(() => {
      void task()
    })
  }
}

function getTimestamp(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }

  return Date.now()
}

function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (!sortedValues.length) {
    return 0
  }

  if (sortedValues.length === 1) {
    return sortedValues[0]
  }

  const index = (sortedValues.length - 1) * percentile
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex]
  }

  const lowerValue = sortedValues[lowerIndex]
  const upperValue = sortedValues[upperIndex]
  const weight = index - lowerIndex

  return lowerValue * (1 - weight) + upperValue * weight
}

function sanitizeJsonValue(value: unknown): Json | undefined {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (Array.isArray(value)) {
    const sanitizedArray: Json[] = []

    for (const item of value) {
      const sanitizedItem = sanitizeJsonValue(item)

      if (sanitizedItem !== undefined) {
        sanitizedArray.push(sanitizedItem)
      }
    }

    return sanitizedArray
  }

  if (typeof value === 'object' && value) {
    const sanitizedObject: Record<string, Json> = {}

    for (const [key, nestedValue] of Object.entries(value)) {
      const sanitizedValue = sanitizeJsonValue(nestedValue)

      if (sanitizedValue !== undefined) {
        sanitizedObject[key] = sanitizedValue
      }
    }

    return sanitizedObject
  }

  if (value === undefined) {
    return undefined
  }

  return String(value)
}

function buildMetadata(metadata?: Record<string, unknown>): Json | null {
  if (!metadata) {
    return null
  }

  const sanitizedEntries: Record<string, Json> = {}

  for (const [key, value] of Object.entries(metadata)) {
    const sanitizedValue = sanitizeJsonValue(value)

    if (sanitizedValue !== undefined) {
      sanitizedEntries[key] = sanitizedValue
    }
  }

  return Object.keys(sanitizedEntries).length > 0 ? sanitizedEntries : null
}

function getPerformanceLogClient(): SupabaseClient<Database> | null {
  if (typeof window !== 'undefined') {
    return null
  }

  if (performanceLogClient) {
    return performanceLogClient
  }

  const supabaseUrl =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined
  const serviceRoleKey =
    typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  performanceLogClient = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return performanceLogClient
}

async function persistPerformanceLog(entry: PerformanceLogInsert) {
  const client = getPerformanceLogClient()

  if (!client) {
    return
  }

  try {
    const { error } = await client.from('performance_logs').insert(entry)

    if (error && typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.warn('Failed to persist performance log', error)
    }
  } catch (error) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.warn('Unexpected error while persisting performance log', error)
    }
  }
}

export function recordPerformanceSample(sample: PerformanceSample) {
  const bucket = performanceWindows.get(sample.key) ?? []

  bucket.push(sample.durationMs)

  if (bucket.length > SAMPLE_WINDOW_SIZE) {
    bucket.shift()
  }

  performanceWindows.set(sample.key, bucket)

  if (bucket.length < MIN_SAMPLE_SIZE_FOR_ALERT) {
    return
  }

  const sorted = [...bucket].sort((a, b) => a - b)
  const p95 = calculatePercentile(sorted, 0.95)
  const p99 = calculatePercentile(sorted, 0.99)

  let threshold: PerformanceLogInsert['threshold'] | null = null

  if (sample.durationMs >= p99) {
    threshold = 'p99'
  } else if (sample.durationMs >= p95) {
    threshold = 'p95'
  }

  if (!threshold) {
    return
  }

  const logEntry: PerformanceLogInsert = {
    source: sample.source,
    key: sample.key,
    helper: sample.helper ?? null,
    environment: sample.environment,
    duration_ms: sample.durationMs,
    threshold,
    calculated_p95_ms: p95,
    calculated_p99_ms: p99,
    sample_size: bucket.length,
    status_code: sample.statusCode ?? null,
    metadata: buildMetadata(sample.metadata),
  }

  schedule(() => persistPerformanceLog(logEntry))
}

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.toString()
  }

  return input.url
}

function extractMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) {
    return init.method.toUpperCase()
  }

  if (typeof input === 'string' || input instanceof URL) {
    return 'GET'
  }

  return input.method?.toUpperCase() ?? 'GET'
}

function normalizeSupabaseOperation(url: URL): {
  operationKey: string
  path: string
  search: string | null
} {
  const path = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
  const sanitizedPath = path.replace(/^rest\/v1\//, '').replace(/^storage\/v1\//, '')
  const operationKey = sanitizedPath || path

  return {
    operationKey,
    path: `/${path}`,
    search: url.search ? url.search : null,
  }
}

export function createSupabaseInstrumentationConfig(
  config: SupabaseInstrumentationConfig
): Pick<SupabaseClientOptions<'public'>, 'global'> {
  if (!globalFetch) {
    return {}
  }

  const supabaseUrl =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined

  if (!supabaseUrl) {
    return {}
  }

  const normalizedBase = new URL(supabaseUrl)
  const baseOrigin = normalizedBase.origin

  const instrumentedFetch: typeof fetch = async (input, init) => {
    const requestUrl = extractUrl(input)

    const shouldTrack = requestUrl.startsWith(baseOrigin)

    const start = getTimestamp()
    let response: Response | undefined
    let fetchError: unknown

    try {
      response = await globalFetch(input as any, init)
      return response
    } catch (error) {
      fetchError = error
      throw error
    } finally {
      if (!shouldTrack) {
        return
      }

      const end = getTimestamp()
      const durationMs = end - start

      try {
        const parsedUrl = new URL(requestUrl)
        const operation = normalizeSupabaseOperation(parsedUrl)

        recordPerformanceSample({
          key: `supabase:${operation.operationKey}:${extractMethod(input, init)}`,
          durationMs,
          source: 'supabase-client',
          environment: config.environment,
          helper: config.helper,
          statusCode: response?.status ?? null,
          metadata: {
            ...config.context,
            method: extractMethod(input, init),
            path: operation.path,
            search: operation.search,
            status: response?.status ?? null,
            error: fetchError instanceof Error ? fetchError.message : undefined,
          },
        })
      } catch (error) {
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
          console.warn('Failed to record Supabase performance sample', error)
        }
      }
    }
  }

  return { global: { fetch: instrumentedFetch } }
}
