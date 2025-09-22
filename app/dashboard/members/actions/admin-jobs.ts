"use server"

import { createSupbaseServerClient } from '@/utils/supaone'
import { sendInAppNotification } from '@/lib/notifications'
import type { Database, Json } from '@/lib/supabase'
import {
  type AdminJobActionResponse,
  type AdminJobDTO,
  type AdminJobPayload,
  type AdminJobResult,
  type AdminJobResultEntry,
  type BulkNotificationPayload,
  type BulkNotificationRequest,
  type BulkStatusUpdatePayload,
  type BulkStatusUpdateRequest,
  type NotificationIntent,
  type ProfileRoleFilter,
  type ProfileStatus,
  type ProfileStatusFilter,
} from '@/types/admin-jobs'

const JOB_BATCH_SIZE = 10

type SupabaseClient = Awaited<ReturnType<typeof createSupbaseServerClient>>
type AdminJobRow = Database['public']['Tables']['admin_jobs']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

type ProfileTarget = Pick<ProfileRow, 'id' | 'status' | 'email' | 'full_name'>

type TargetResolution = {
  targets: ProfileTarget[]
  payload: AdminJobPayload
}

export async function listRecentAdminJobs(limit = 10): Promise<AdminJobDTO[]> {
  const supabase = await createSupbaseServerClient()

  const { data, error } = await supabase
    .from('admin_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    console.error('Failed to load admin jobs', error)
    return []
  }

  return data.map(mapJobRowToDTO)
}

export async function enqueueBulkStatusUpdate(
  request: BulkStatusUpdateRequest
): Promise<AdminJobActionResponse> {
  if (
    request.sendNotification &&
    (!request.notificationTitle || !request.notificationMessage)
  ) {
    return {
      error:
        'Notification title and message are required when notifications are enabled.',
    }
  }

  try {
    const supabase = await createSupbaseServerClient()

    const resolved = await resolveStatusUpdateTargets(supabase, request)

    if (resolved.targets.length === 0) {
      return {
        error: 'No members matched the selected filters.',
      }
    }

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('Failed to resolve admin user for job queue', authError)
    }

    const jobPayload: BulkStatusUpdatePayload = {
      type: 'status_update',
      targetUserIds: resolved.targets.map((target) => target.id),
      nextStatus: request.nextStatus,
      notify: Boolean(request.sendNotification),
      notification:
        request.sendNotification && request.notificationTitle
          ? {
              title: request.notificationTitle,
              message: request.notificationMessage || '',
              type: request.notificationType ?? 'info',
              actionUrl: request.actionUrl,
            }
          : undefined,
      filters: {
        role: request.role,
        currentStatus: request.currentStatus,
      },
      summary: {
        count: resolved.targets.length,
      },
    }

    const totalTasks = jobPayload.targetUserIds.length

    const { data, error } = await supabase
      .from('admin_jobs')
      .insert({
        type: 'status_update',
        status: 'queued',
        payload: toJson(jobPayload),
        total_tasks: totalTasks,
        processed_tasks: 0,
        requested_by: authData?.user?.id ?? null,
      })
      .select('*')
      .single()

    if (error || !data) {
      console.error('Failed to enqueue status update job', error)
      return {
        error:
          error?.message ?? 'Unable to create the bulk status update job.',
      }
    }

    if (totalTasks === 0) {
      return { job: mapJobRowToDTO(data) }
    }

    const processedJob = await processJobRow(data, supabase)

    return { job: processedJob }
  } catch (error) {
    console.error('Unexpected error while enqueuing status job', error)
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Unexpected error while creating the job.',
    }
  }
}

export async function enqueueBulkNotification(
  request: BulkNotificationRequest
): Promise<AdminJobActionResponse> {
  if (!request.notificationTitle || !request.notificationMessage) {
    return { error: 'Notification title and message are required.' }
  }

  try {
    const supabase = await createSupbaseServerClient()

    const resolved = await resolveNotificationTargets(supabase, request)

    if (resolved.targets.length === 0) {
      return {
        error: 'No members matched the selected filters.',
      }
    }

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('Failed to resolve admin user for notification job', authError)
    }

    const jobPayload: BulkNotificationPayload = {
      type: 'notification',
      targetUserIds: resolved.targets.map((target) => target.id),
      notification: {
        title: request.notificationTitle,
        message: request.notificationMessage,
        type: request.notificationType,
        actionUrl: request.actionUrl,
      },
      filters: {
        role: request.role,
        currentStatus: request.currentStatus,
      },
      summary: {
        count: resolved.targets.length,
      },
    }

    const { data, error } = await supabase
      .from('admin_jobs')
      .insert({
        type: 'notification',
        status: 'queued',
        payload: toJson(jobPayload),
        total_tasks: jobPayload.targetUserIds.length,
        processed_tasks: 0,
        requested_by: authData?.user?.id ?? null,
      })
      .select('*')
      .single()

    if (error || !data) {
      console.error('Failed to enqueue notification job', error)
      return {
        error:
          error?.message ?? 'Unable to create the bulk notification job.',
      }
    }

    const processedJob = await processJobRow(data, supabase)

    return { job: processedJob }
  } catch (error) {
    console.error('Unexpected error while enqueuing notification job', error)
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Unexpected error while creating the job.',
    }
  }
}

export async function pollAdminJobs(jobIds: string[]): Promise<AdminJobDTO[]> {
  if (jobIds.length === 0) {
    return []
  }

  const supabase = await createSupbaseServerClient()
  const updates: AdminJobDTO[] = []

  for (const jobId of jobIds) {
    const job = await processJobById(jobId, supabase)
    if (job) {
      updates.push(job)
    }
  }

  return updates
}

export async function cancelAdminJob(jobId: string): Promise<AdminJobActionResponse> {
  const supabase = await createSupbaseServerClient()

  const { data, error } = await supabase
    .from('admin_jobs')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .in('status', ['queued', 'running'])
    .select('*')
    .single()

  if (error) {
    console.error('Failed to cancel admin job', error)
    return {
      error: error.message ?? 'Unable to cancel the job.',
    }
  }

  if (!data) {
    return {
      error: 'Only queued or running jobs can be cancelled.',
    }
  }

  return { job: mapJobRowToDTO(data) }
}

export async function retryAdminJob(jobId: string): Promise<AdminJobActionResponse> {
  const supabase = await createSupbaseServerClient()

  const { data: jobRow, error: fetchError } = await supabase
    .from('admin_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (fetchError || !jobRow) {
    console.error('Failed to fetch job for retry', fetchError)
    return {
      error: 'Unable to locate the requested job.',
    }
  }

  if (jobRow.status === 'running' || jobRow.status === 'queued') {
    return { error: 'Running jobs cannot be retried.' }
  }

  const payload = parsePayload(jobRow)

  if (!payload) {
    return { error: 'Job payload is missing or invalid.' }
  }

  let refreshed: TargetResolution

  try {
    if (payload.type === 'status_update') {
      refreshed = await resolveStatusPayloadFromJob(supabase, payload)
    } else {
      refreshed = await resolveNotificationPayloadFromJob(supabase, payload)
    }
  } catch (error) {
    console.error('Failed to refresh job targets before retry', error)
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Unable to refresh job targets for retry.',
    }
  }

  if (refreshed.targets.length === 0) {
    return { error: 'No members match the original job filters anymore.' }
  }

  const { data, error } = await supabase
    .from('admin_jobs')
    .update({
      status: 'queued',
      processed_tasks: 0,
      total_tasks: refreshed.targets.length,
      error: null,
      completed_at: null,
      cancelled_at: null,
      result: null,
      payload: toJson(refreshed.payload),
    })
    .eq('id', jobId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('Failed to reset job for retry', error)
    return {
      error: error?.message ?? 'Unable to reset the job for retry.',
    }
  }

  const processedJob = await processJobRow(data, supabase)
  return { job: processedJob }
}

export async function getAdminJob(jobId: string): Promise<AdminJobDTO | null> {
  const supabase = await createSupbaseServerClient()

  const { data, error } = await supabase
    .from('admin_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !data) {
    console.error('Failed to fetch admin job', error)
    return null
  }

  if (data.status === 'queued' || data.status === 'running') {
    return processJobRow(data, supabase)
  }

  return mapJobRowToDTO(data)
}

async function processJobById(
  jobId: string,
  existingClient?: SupabaseClient
): Promise<AdminJobDTO | null> {
  const supabase = existingClient ?? (await createSupbaseServerClient())

  const { data, error } = await supabase
    .from('admin_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !data) {
    if (error) {
      console.error('Failed to fetch job during polling', error)
    }
    return null
  }

  return processJobRow(data, supabase)
}

async function processJobRow(
  row: AdminJobRow,
  supabase: SupabaseClient
): Promise<AdminJobDTO> {
  if (row.status === 'cancelled' || row.status === 'failed') {
    return mapJobRowToDTO(row)
  }

  const payload = parsePayload(row)
  const existingResult = parseResult(row)

  if (!payload) {
    return mapJobRowToDTO(row)
  }

  try {
    const totalTargets = payload.targetUserIds.length
    const processedTasks = Math.min(row.processed_tasks, totalTargets)

    if (row.total_tasks !== totalTargets) {
      row.total_tasks = totalTargets
    }

    if (totalTargets === 0) {
      const update = await supabase
        .from('admin_jobs')
        .update({
          status: 'completed',
          total_tasks: 0,
          processed_tasks: 0,
          result: existingResult ? toJson(existingResult) : null,
          error: null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .select('*')
        .single()

      if (update.error || !update.data) {
        console.error('Failed to finalize empty job', update.error)
        return mapJobRowToDTO(row)
      }

      return mapJobRowToDTO(update.data)
    }

    if (processedTasks >= totalTargets) {
      if (row.status !== 'completed') {
        const { data, error } = await supabase
          .from('admin_jobs')
          .update({
            status: 'completed',
            processed_tasks: totalTargets,
            total_tasks: totalTargets,
            error:
              existingResult && existingResult.summary.failures > 0
                ? `${existingResult.summary.failures} item(s) failed`
                : null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', row.id)
          .select('*')
          .single()

        if (error || !data) {
          console.error('Failed to mark job as completed', error)
          return mapJobRowToDTO(row)
        }

        return mapJobRowToDTO(data)
      }

      return mapJobRowToDTO(row)
    }

    const batchIds = payload.targetUserIds.slice(
      processedTasks,
      Math.min(processedTasks + JOB_BATCH_SIZE, totalTargets)
    )

    const batchProfiles = await fetchProfileBatch(batchIds, supabase)

    const entries: AdminJobResultEntry[] = []

    for (const userId of batchIds) {
      const profile = batchProfiles.get(userId)
      const timestamp = new Date().toISOString()

      if (!profile) {
        entries.push({
          userId,
          success: false,
          action: payload.type,
          notified: false,
          error: 'Profile not found for this member.',
          timestamp,
        })
        continue
      }

      if (payload.type === 'status_update') {
        const entry = await processStatusUpdateTarget(
          supabase,
          profile,
          payload,
          timestamp
        )
        entries.push(entry)
      } else {
        const entry = await processNotificationTarget(
          profile,
          payload.notification,
          timestamp
        )
        entries.push(entry)
      }
    }

    const mergedResult = mergeResult(existingResult, entries)
    const newProcessed = processedTasks + batchIds.length
    const isComplete = newProcessed >= totalTargets
    const failureCount = mergedResult.summary.failures

    const updateFields: Partial<AdminJobRow> = {
      status: isComplete ? 'completed' : 'running',
      processed_tasks: newProcessed,
      total_tasks: totalTargets,
      result: toJson(mergedResult),
      error:
        failureCount > 0
          ? isComplete
            ? `${failureCount} item(s) failed`
            : 'Encountered processing errors'
          : null,
      last_progress_at: new Date().toISOString(),
      completed_at: isComplete ? new Date().toISOString() : row.completed_at,
      payload: toJson(payload),
    }

    const { data, error } = await supabase
      .from('admin_jobs')
      .update(updateFields)
      .eq('id', row.id)
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to persist job progress')
    }

    return mapJobRowToDTO(data)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected error while processing job.'

    const { data, error: updateError } = await supabase
      .from('admin_jobs')
      .update({
        status: 'failed',
        error: message,
      })
      .eq('id', row.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Failed to set job as failed', updateError)
      return {
        ...mapJobRowToDTO(row),
        status: 'failed',
        error: message,
      }
    }

    return mapJobRowToDTO(data)
  }
}

function mergeResult(
  existing: AdminJobResult | null,
  newEntries: AdminJobResultEntry[]
): AdminJobResult {
  const base: AdminJobResult =
    existing ?? ({
      entries: [],
      summary: { successes: 0, failures: 0 },
    } as AdminJobResult)

  const entries = [...base.entries, ...newEntries]
  const summary = { ...base.summary }

  for (const entry of newEntries) {
    if (entry.success) {
      summary.successes += 1
    } else {
      summary.failures += 1
    }
  }

  return {
    entries,
    summary,
  }
}

async function processStatusUpdateTarget(
  supabase: SupabaseClient,
  profile: ProfileTarget,
  payload: BulkStatusUpdatePayload,
  timestamp: string
): Promise<AdminJobResultEntry> {
  let success = true
  let errorMessage: string | undefined
  let notified = false

  if (profile.status === payload.nextStatus) {
    success = false
    errorMessage = 'Member already has the requested status.'
  } else {
    const { error } = await supabase
      .from('profiles')
      .update({ status: payload.nextStatus })
      .eq('id', profile.id)

    if (error) {
      success = false
      errorMessage = error.message
    }
  }

  if (success && payload.notify && payload.notification) {
    const notificationIntent = enrichNotificationIntent(
      payload.notification,
      profile
    )
    const notificationResult = await sendInAppNotification({
      userId: profile.id,
      title: notificationIntent.title,
      message: notificationIntent.message,
      type: notificationIntent.type,
      actionUrl: notificationIntent.actionUrl,
    })

    notified = notificationResult.success

    if (!notificationResult.success) {
      success = false
      errorMessage =
        notificationResult.error ?? 'Failed to send status notification.'
    }
  }

  return {
    userId: profile.id,
    success,
    action: 'status_update',
    notified,
    error: errorMessage,
    timestamp,
  }
}

async function processNotificationTarget(
  profile: ProfileTarget,
  notification: NotificationIntent,
  timestamp: string
): Promise<AdminJobResultEntry> {
  const notificationIntent = enrichNotificationIntent(notification, profile)

  const result = await sendInAppNotification({
    userId: profile.id,
    title: notificationIntent.title,
    message: notificationIntent.message,
    type: notificationIntent.type,
    actionUrl: notificationIntent.actionUrl,
  })

  return {
    userId: profile.id,
    success: result.success,
    action: 'notification',
    notified: result.success,
    error: result.success
      ? undefined
      : result.error ?? 'Failed to send notification.',
    timestamp,
  }
}

function enrichNotificationIntent(
  intent: NotificationIntent,
  profile: ProfileTarget
): NotificationIntent {
  const message = intent.message
    .replace('{name}', profile.full_name ?? 'there')
    .replace('{status}', profile.status)

  return {
    ...intent,
    message,
  }
}

async function fetchProfileBatch(
  ids: string[],
  supabase: SupabaseClient
): Promise<Map<string, ProfileTarget>> {
  if (ids.length === 0) {
    return new Map()
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, status, email, full_name')
    .in('id', ids)

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to load members for batch.')
  }

  const map = new Map<string, ProfileTarget>()

  for (const profile of data) {
    map.set(profile.id, {
      id: profile.id,
      status: profile.status as ProfileStatus,
      email: profile.email ?? null,
      full_name: profile.full_name ?? null,
    })
  }

  return map
}

async function resolveStatusUpdateTargets(
  supabase: SupabaseClient,
  request: BulkStatusUpdateRequest
): Promise<TargetResolution> {
  const targets = await queryProfiles(supabase, {
    role: request.role,
    currentStatus: request.currentStatus,
  })

  const filtered = targets.filter(
    (profile) => profile.status !== request.nextStatus
  )

  const payload: BulkStatusUpdatePayload = {
    type: 'status_update',
    targetUserIds: filtered.map((profile) => profile.id),
    nextStatus: request.nextStatus,
    notify: request.sendNotification,
    notification:
      request.sendNotification && request.notificationTitle
        ? {
            title: request.notificationTitle,
            message: request.notificationMessage || '',
            type: request.notificationType ?? 'info',
            actionUrl: request.actionUrl,
          }
        : undefined,
    filters: {
      role: request.role,
      currentStatus: request.currentStatus,
    },
    summary: {
      count: filtered.length,
    },
  }

  return {
    targets: filtered,
    payload,
  }
}

async function resolveNotificationTargets(
  supabase: SupabaseClient,
  request: BulkNotificationRequest
): Promise<TargetResolution> {
  const targets = await queryProfiles(supabase, {
    role: request.role,
    currentStatus: request.currentStatus,
  })

  const payload: BulkNotificationPayload = {
    type: 'notification',
    targetUserIds: targets.map((profile) => profile.id),
    notification: {
      title: request.notificationTitle,
      message: request.notificationMessage,
      type: request.notificationType,
      actionUrl: request.actionUrl,
    },
    filters: {
      role: request.role,
      currentStatus: request.currentStatus,
    },
    summary: {
      count: targets.length,
    },
  }

  return {
    targets,
    payload,
  }
}

async function resolveStatusPayloadFromJob(
  supabase: SupabaseClient,
  payload: BulkStatusUpdatePayload
): Promise<TargetResolution> {
  const targets = await queryProfiles(supabase, payload.filters)
  const filtered = targets.filter(
    (profile) => profile.status !== payload.nextStatus
  )

  return {
    targets: filtered,
    payload: {
      ...payload,
      targetUserIds: filtered.map((profile) => profile.id),
      summary: {
        count: filtered.length,
      },
    },
  }
}

async function resolveNotificationPayloadFromJob(
  supabase: SupabaseClient,
  payload: BulkNotificationPayload
): Promise<TargetResolution> {
  const targets = await queryProfiles(supabase, payload.filters)

  return {
    targets,
    payload: {
      ...payload,
      targetUserIds: targets.map((profile) => profile.id),
      summary: {
        count: targets.length,
      },
    },
  }
}

async function queryProfiles(
  supabase: SupabaseClient,
  filters: {
    role: ProfileRoleFilter
    currentStatus: ProfileStatusFilter
  }
): Promise<ProfileTarget[]> {
  let query = supabase
    .from('profiles')
    .select('id, status, email, full_name, role')

  if (filters.role !== 'all') {
    query = query.eq('role', filters.role)
  }

  if (filters.currentStatus !== 'all') {
    query = query.eq('status', filters.currentStatus)
  }

  const { data, error } = await query

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to query member profiles.')
  }

  return data.map((profile) => ({
    id: profile.id,
    status: profile.status as ProfileStatus,
    email: profile.email ?? null,
    full_name: profile.full_name ?? null,
  }))
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json
}

function parsePayload(row: AdminJobRow): AdminJobPayload | null {
  if (!row.payload) {
    return null
  }

  try {
    return JSON.parse(JSON.stringify(row.payload)) as AdminJobPayload
  } catch (error) {
    console.error('Failed to parse admin job payload', error)
    return null
  }
}

function parseResult(row: AdminJobRow): AdminJobResult | null {
  if (!row.result) {
    return null
  }

  try {
    return JSON.parse(JSON.stringify(row.result)) as AdminJobResult
  } catch (error) {
    console.error('Failed to parse admin job result', error)
    return null
  }
}

function mapJobRowToDTO(row: AdminJobRow): AdminJobDTO {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    totalTasks: row.total_tasks,
    processedTasks: row.processed_tasks,
    error: row.error ?? null,
    requestedBy: row.requested_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    payload: (JSON.parse(JSON.stringify(row.payload)) as AdminJobPayload) ?? {
      type: 'notification',
      targetUserIds: [],
      notification: {
        title: 'Unknown',
        message: 'Unknown payload',
        type: 'info',
      },
      filters: { role: 'all', currentStatus: 'all' },
      summary: { count: 0 },
    },
    result: row.result
      ? (JSON.parse(JSON.stringify(row.result)) as AdminJobResult)
      : null,
  }
}
