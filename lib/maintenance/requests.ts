import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'
import type { Database, Json } from '@/lib/supabase'

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>

type MaintenanceRequestRow = Database['public']['Tables']['maintenance_requests']['Row']
type MaintenanceRequestVersionRow = Database['public']['Tables']['maintenance_request_versions']['Row']

export type MaintenanceRequestWithVersions = MaintenanceRequestRow & {
  versions: MaintenanceRequestVersionRow[]
}

type MaintenanceRequestPayload = {
  title: string
  description: string
  priority: MaintenanceRequestRow['priority']
  category?: string | null
  location?: string | null
}

type FetchMaintenanceRequestsParams = {
  client: SupabaseClientLike
  userId: string
  unitId?: string | null
}

type CreateDraftParams = {
  client: SupabaseClientLike
  payload: MaintenanceRequestPayload
  userId: string
  unitId: string
}

type PublishParams = {
  client: SupabaseClientLike
  request: MaintenanceRequestRow
  userId: string
}

type AppendVersionParams = {
  client: SupabaseClientLike
  request: MaintenanceRequestRow
  userId: string
  versionOverride?: number
  publishedAt?: string | null
}

function normalizeSnapshot(request: MaintenanceRequestRow): Json {
  return {
    title: request.title,
    description: request.description,
    priority: request.priority,
    status: request.status,
    state: request.state,
    category: request.category,
    location: request.location,
    requested_by: request.requested_by,
    assigned_to: request.assigned_to,
    unit_id: request.unit_id,
    notes: request.notes,
    attachments: request.attachments ?? [],
    metadata: request.metadata ?? {},
    version: request.version,
  }
}

async function appendMaintenanceRequestVersion({
  client,
  request,
  userId,
  versionOverride,
  publishedAt,
}: AppendVersionParams) {
  const version = versionOverride ?? request.version ?? 1
  const payload = {
    request_id: request.id,
    version,
    state: request.state,
    status: request.status,
    snapshot: normalizeSnapshot(request),
    created_by: userId,
    published_at: publishedAt ?? (request.state === 'published' ? new Date().toISOString() : null),
  }

  const { error } = await (client as any)
    .from('maintenance_request_versions')
    .insert(payload)

  if (error) {
    throw new Error(`Failed to append maintenance request version: ${error.message}`)
  }
}

export async function fetchMaintenanceRequests({
  client,
  userId,
  unitId,
}: FetchMaintenanceRequestsParams): Promise<MaintenanceRequestWithVersions[]> {
  let query = (client as any)
    .from('maintenance_requests')
    .select(`
      *,
      versions:maintenance_request_versions(
        id,
        request_id,
        version,
        state,
        status,
        snapshot,
        created_at,
        created_by,
        published_at
      )
    `)

  if (unitId) {
    query = query.or(
      [
        `requested_by.eq.${userId}`,
        `and(state.eq.published,unit_id.eq.${unitId})`,
      ].join(',')
    )
  } else {
    query = query.eq('requested_by', userId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch maintenance requests: ${error.message}`)
  }

  const requests = (data ?? []) as Array<MaintenanceRequestRow & { versions?: MaintenanceRequestVersionRow[] | null }>

  return requests.map((request) => ({
    ...request,
    versions: (request.versions ?? [])
      .filter((version): version is MaintenanceRequestVersionRow => Boolean(version))
      .slice()
      .sort((a, b) => b.version - a.version),
  }))
}

export async function createMaintenanceRequestDraft({
  client,
  payload,
  userId,
  unitId,
}: CreateDraftParams): Promise<MaintenanceRequestRow> {
  const insertPayload = {
    title: payload.title,
    description: payload.description,
    priority: payload.priority,
    category: payload.category ?? null,
    location: payload.location ?? null,
    status: 'pending' as MaintenanceRequestRow['status'],
    state: 'draft' as MaintenanceRequestRow['state'],
    requested_by: userId,
    unit_id: unitId,
    version: 1,
  }

  const { data, error } = await (client as any)
    .from('maintenance_requests')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(
      `Failed to create maintenance request draft: ${error?.message ?? 'Unknown error'}`
    )
  }

  const request = data as MaintenanceRequestRow
  await appendMaintenanceRequestVersion({ client, request, userId, versionOverride: request.version ?? 1 })

  return request
}

export async function publishMaintenanceRequest({
  client,
  request,
  userId,
}: PublishParams): Promise<MaintenanceRequestRow> {
  const nextVersion = (request.version ?? 1) + 1

  const { data, error } = await (client as any)
    .from('maintenance_requests')
    .update({
      state: 'published',
      version: nextVersion,
    })
    .eq('id', request.id)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to publish maintenance request: ${error?.message ?? 'Unknown error'}`)
  }

  const updatedRequest = data as MaintenanceRequestRow

  await appendMaintenanceRequestVersion({
    client,
    request: updatedRequest,
    userId,
    versionOverride: updatedRequest.version ?? nextVersion,
    publishedAt: new Date().toISOString(),
  })

  return updatedRequest
}

export async function unpublishMaintenanceRequest({
  client,
  request,
  userId,
}: PublishParams): Promise<MaintenanceRequestRow> {
  const nextVersion = (request.version ?? 1) + 1

  const { data, error } = await (client as any)
    .from('maintenance_requests')
    .update({
      state: 'draft',
      version: nextVersion,
    })
    .eq('id', request.id)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to unpublish maintenance request: ${error?.message ?? 'Unknown error'}`)
  }

  const updatedRequest = data as MaintenanceRequestRow

  await appendMaintenanceRequestVersion({
    client,
    request: updatedRequest,
    userId,
    versionOverride: updatedRequest.version ?? nextVersion,
    publishedAt: null,
  })

  return updatedRequest
}
