import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Agent, setGlobalDispatcher } from 'undici'

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

type ServiceRoleClient = SupabaseClient<Database>

type SupabaseGlobalState = {
  __supabaseServiceRoleClient?: ServiceRoleClient
  __supabaseAnonClient?: SupabaseClient<Database>
  __supabaseFetchAgent?: Agent
}

const globalForSupabase = globalThis as typeof globalThis & SupabaseGlobalState

const DEFAULT_KEEP_ALIVE_TIMEOUT = 30_000
const DEFAULT_KEEP_ALIVE_MAX_TIMEOUT = 120_000

const ensureSupabaseFetchAgent = () => {
  if (!globalForSupabase.__supabaseFetchAgent) {
    const agent = new Agent({
      connect: {
        keepAlive: true,
      },
      keepAliveTimeout: DEFAULT_KEEP_ALIVE_TIMEOUT,
      keepAliveMaxTimeout: DEFAULT_KEEP_ALIVE_MAX_TIMEOUT,
    })

    setGlobalDispatcher(agent)
    globalForSupabase.__supabaseFetchAgent = agent
  }

  return globalForSupabase.__supabaseFetchAgent
}

const keepAliveFetch: typeof fetch = (input, init = {}) => {
  ensureSupabaseFetchAgent()

  return fetch(input, {
    ...init,
    keepalive: true,
  })
}

const getSupabaseUrl = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  return supabaseUrl
}

const getSupabaseAnonKey = () => {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured')
  }

  return anonKey
}

const getSupabaseServiceRoleKey = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return serviceRoleKey
}

const isLocalDatabase = (connectionString: string) =>
  /localhost|127\.0\.0\.1/.test(connectionString)

export const getSupabaseDatabaseUrl = () => {
  const databaseUrl = process.env.SUPABASE_DB_URL

  if (!databaseUrl) {
    throw new Error('SUPABASE_DB_URL is not configured')
  }

  return databaseUrl
}

export const getSupabasePoolerUrl = () => {
  const poolerUrl = process.env.SUPABASE_DB_POOLER_URL

  if (poolerUrl) {
    return poolerUrl
  }

  return getSupabaseDatabaseUrl()
}

export const getPoolerSslConfig = () => {
  const poolerUrl = getSupabasePoolerUrl()

  if (isLocalDatabase(poolerUrl)) {
    return false
  }

  return {
    rejectUnauthorized: false,
  }
}

export const getSupabaseAnonClient = (): SupabaseClient<Database> => {
  ensureSupabaseFetchAgent()

  if (!globalForSupabase.__supabaseAnonClient) {
    globalForSupabase.__supabaseAnonClient = createClient<Database>(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
      {
        auth: {
          persistSession: false,
        },
        global: {
          fetch: keepAliveFetch,
        },
      }
    )
  }

  return globalForSupabase.__supabaseAnonClient
}

export const getSupabaseServiceRoleClient = (): ServiceRoleClient => {
  ensureSupabaseFetchAgent()

  if (!globalForSupabase.__supabaseServiceRoleClient) {
    globalForSupabase.__supabaseServiceRoleClient = createClient<Database>(
      getSupabaseUrl(),
      getSupabaseServiceRoleKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          fetch: keepAliveFetch,
        },
      }
    )
  }

  return globalForSupabase.__supabaseServiceRoleClient
}

export const resetSupabaseClients = () => {
  if (globalForSupabase.__supabaseAnonClient) {
    globalForSupabase.__supabaseAnonClient = undefined
  }

  if (globalForSupabase.__supabaseServiceRoleClient) {
    globalForSupabase.__supabaseServiceRoleClient = undefined
  }

  if (globalForSupabase.__supabaseFetchAgent) {
    void globalForSupabase.__supabaseFetchAgent.close()
    globalForSupabase.__supabaseFetchAgent = undefined
  }
}

export const getPoolerThresholdsFromEnv = () => {
  const warning = Number(process.env.SUPABASE_POOLER_WARNING_THRESHOLD ?? '0.7')
  const critical = Number(process.env.SUPABASE_POOLER_CRITICAL_THRESHOLD ?? '0.9')

  const clamp = (value: number, fallback: number) => {
    if (!Number.isFinite(value)) {
      return fallback
    }

    return Math.min(Math.max(value, 0), 1)
  }

  const sanitizedWarning = clamp(warning, 0.7)
  const sanitizedCritical = clamp(critical, 0.9)

  return {
    warning: sanitizedWarning,
    critical: Math.max(sanitizedWarning, sanitizedCritical),
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __supabaseServiceRoleClient: ServiceRoleClient | undefined
  // eslint-disable-next-line no-var
  var __supabaseAnonClient: SupabaseClient<Database> | undefined
  // eslint-disable-next-line no-var
  var __supabaseFetchAgent: Agent | undefined
}
