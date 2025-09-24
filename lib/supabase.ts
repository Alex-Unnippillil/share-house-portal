import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createHash, randomBytes, randomUUID } from "crypto"

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
      amenity_bookings: SupabaseTable<{
        id: string
        amenity_id: string
        household_id: string | null
        created_by: string
        status: 'pending' | 'confirmed' | 'cancelled'
        start_time: string
        end_time: string
        created_at: string | null
        updated_at: string | null
        metadata: Json | null
      }>
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
      oauth_clients: SupabaseTable<{
        id: string
        client_id: string
        client_name: string
        redirect_uri: string | null
        description: string | null
        created_at: string | null
        updated_at: string | null
        created_by: string | null
        active_key_id: string | null
        metadata: Json | null
        last_rotated_at: string | null
      }>
      oauth_client_keys: SupabaseTable<{
        id: string
        client_id: string
        hashed_secret: string
        status: 'active' | 'rotated' | 'revoked'
        created_at: string | null
        rotated_at: string | null
        revoked_at: string | null
        expires_at: string | null
        issued_by: string | null
        rotated_by: string | null
        last_four: string | null
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
        payer_name: string | null
        tenant_id: string | null
        unit: string | null
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
      check_amenity_conflicts: {
        Args: {
          p_amenity_id: string
          p_start_time: string
          p_end_time: string
          p_household_id?: string | null
          p_booking_id?: string | null
        }
        Returns: Json
      }
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

type ServiceRoleClient = SupabaseClient<Database, 'public'>

const SECRET_BYTE_LENGTH = 32

function toBase64Url(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function generateClientId() {
  return `shp_${toBase64Url(randomBytes(16))}`
}

function generateClientSecret() {
  return toBase64Url(randomBytes(SECRET_BYTE_LENGTH))
}

function hashSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex')
}

let cachedServiceRoleClient: ServiceRoleClient | null = null

export class OAuthClientError extends Error {
  constructor(message: string, public status: number = 500) {
    super(message)
    this.name = 'OAuthClientError'
  }
}

export class OAuthClientNotFoundError extends OAuthClientError {
  constructor(clientId: string) {
    super(`OAuth client ${clientId} was not found`, 404)
    this.name = 'OAuthClientNotFoundError'
  }
}

function getServiceRoleClient(): ServiceRoleClient {
  if (cachedServiceRoleClient) {
    return cachedServiceRoleClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new OAuthClientError(
      'Supabase service role credentials are not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  cachedServiceRoleClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cachedServiceRoleClient
}

type OAuthClientRow = Database['public']['Tables']['oauth_clients']['Row']
type OAuthClientKeyRow = Database['public']['Tables']['oauth_client_keys']['Row']

export interface IssueOAuthClientParams {
  name: string
  redirectUri?: string
  description?: string
  createdBy: string
}

export interface IssuedOAuthClientCredentials {
  clientId: string
  clientSecret: string
  keyId: string
  clientRowId: string
}

export async function issueClientCredentials({
  name,
  redirectUri,
  description,
  createdBy,
}: IssueOAuthClientParams): Promise<IssuedOAuthClientCredentials> {
  const supabase = getServiceRoleClient()
  const now = new Date().toISOString()
  const clientRowId = randomUUID()
  const keyRowId = randomUUID()
  const clientId = generateClientId()
  const clientSecret = generateClientSecret()
  const hashedSecret = hashSecret(clientSecret)

  const clientInsert: Partial<OAuthClientRow> = {
    id: clientRowId,
    client_id: clientId,
    client_name: name.trim(),
    redirect_uri: redirectUri ?? null,
    description: description ?? null,
    created_by: createdBy,
    active_key_id: null,
    metadata: null,
    created_at: now,
    updated_at: now,
    last_rotated_at: null,
  }

  const { error: clientError } = await supabase
    .from('oauth_clients')
    .insert(clientInsert)

  if (clientError) {
    console.error('[supabase] Failed to create OAuth client record', clientError)
    throw new OAuthClientError(
      `Failed to create OAuth client: ${clientError.message}`
    )
  }

  const keyInsert: Partial<OAuthClientKeyRow> = {
    id: keyRowId,
    client_id: clientRowId,
    hashed_secret: hashedSecret,
    status: 'active',
    created_at: now,
    issued_by: createdBy,
    rotated_at: null,
    rotated_by: null,
    revoked_at: null,
    expires_at: null,
    last_four: clientSecret.slice(-4),
  }

  const { error: keyError } = await supabase
    .from('oauth_client_keys')
    .insert(keyInsert)

  if (keyError) {
    console.error('[supabase] Failed to store OAuth client key', keyError)
    await supabase.from('oauth_clients').delete().eq('id', clientRowId)
    throw new OAuthClientError(
      `Failed to persist OAuth client key: ${keyError.message}`
    )
  }

  const { error: updateError } = await supabase
    .from('oauth_clients')
    .update({
      active_key_id: keyRowId,
      last_rotated_at: now,
      updated_at: now,
    })
    .eq('id', clientRowId)

  if (updateError) {
    console.error('[supabase] Failed to finalize OAuth client creation', updateError)
    throw new OAuthClientError(
      `Failed to finalize OAuth client creation: ${updateError.message}`
    )
  }

  console.info('[supabase] Stored OAuth client credentials', {
    clientId,
    clientRowId,
    keyId: keyRowId,
  })

  return {
    clientId,
    clientSecret,
    keyId: keyRowId,
    clientRowId,
  }
}

export interface RotateOAuthClientSecretParams {
  clientId: string
  rotatedBy: string
}

export interface RotatedOAuthClientSecret {
  clientId: string
  clientSecret: string
  keyId: string
  previousKeyId: string | null
}

export async function rotateClientSecret({
  clientId,
  rotatedBy,
}: RotateOAuthClientSecretParams): Promise<RotatedOAuthClientSecret> {
  const supabase = getServiceRoleClient()
  const now = new Date().toISOString()

  const { data: client, error: clientError } = await supabase
    .from('oauth_clients')
    .select('id, active_key_id')
    .eq('client_id', clientId)
    .maybeSingle<Pick<OAuthClientRow, 'id' | 'active_key_id'>>()

  if (clientError) {
    console.error('[supabase] Failed to load OAuth client for rotation', clientError)
    throw new OAuthClientError(
      `Failed to load OAuth client: ${clientError.message}`
    )
  }

  if (!client) {
    console.warn('[supabase] Attempted to rotate missing OAuth client', {
      clientId,
    })
    throw new OAuthClientNotFoundError(clientId)
  }

  const newSecret = generateClientSecret()
  const newKeyId = randomUUID()
  const hashedSecret = hashSecret(newSecret)

  const { error: insertKeyError } = await supabase
    .from('oauth_client_keys')
    .insert({
      id: newKeyId,
      client_id: client.id,
      hashed_secret: hashedSecret,
      status: 'active',
      created_at: now,
      issued_by: rotatedBy,
      rotated_at: null,
      rotated_by: null,
      revoked_at: null,
      expires_at: null,
      last_four: newSecret.slice(-4),
    })

  if (insertKeyError) {
    console.error('[supabase] Failed to insert rotated OAuth key', insertKeyError)
    throw new OAuthClientError(
      `Failed to store rotated key: ${insertKeyError.message}`
    )
  }

  if (client.active_key_id) {
    const { error: archiveError } = await supabase
      .from('oauth_client_keys')
      .update({
        status: 'rotated',
        rotated_at: now,
        rotated_by: rotatedBy,
      })
      .eq('id', client.active_key_id)

    if (archiveError) {
      console.error(
        '[supabase] Failed to mark previous OAuth key as rotated',
        archiveError
      )
      throw new OAuthClientError(
        `Failed to archive previous key: ${archiveError.message}`
      )
    }
  }

  const { error: updateClientError } = await supabase
    .from('oauth_clients')
    .update({
      active_key_id: newKeyId,
      updated_at: now,
      last_rotated_at: now,
    })
    .eq('id', client.id)

  if (updateClientError) {
    console.error('[supabase] Failed to update OAuth client after rotation', updateClientError)
    throw new OAuthClientError(
      `Failed to update OAuth client: ${updateClientError.message}`
    )
  }

  console.info('[supabase] Rotated OAuth client secret', {
    clientId,
    previousKeyId: client.active_key_id ?? null,
    keyId: newKeyId,
  })

  return {
    clientId,
    clientSecret: newSecret,
    keyId: newKeyId,
    previousKeyId: client.active_key_id ?? null,
  }
}
