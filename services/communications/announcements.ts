import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'
import { HttpError, throwIfSupabaseError } from './errors'
import type {
  AnnouncementFilters,
  AnnouncementRecord,
  CreateAnnouncementInput,
  RequestContext,
  UpdateAnnouncementInput,
} from './types'
import { requireRole } from './auth'

function filterAnnouncementsForContext(
  context: RequestContext,
  announcements: AnnouncementRecord[],
  filters: AnnouncementFilters,
): AnnouncementRecord[] {
  const now = new Date()
  const statusFilter = filters.status

  let result = announcements

  if (statusFilter) {
    result = result.filter(announcement => announcement.status === statusFilter)
  }

  if (context.role !== 'admin') {
    result = result.filter(announcement => {
      if (announcement.target_roles && announcement.target_roles.length > 0) {
        return announcement.target_roles.includes(context.role)
      }

      return true
    })
  }

  const applyLifecycleFilter =
    context.role !== 'admin' || filters.includeExpired === false

  if (applyLifecycleFilter) {
    result = result.filter(announcement => {
      if (announcement.expire_at) {
        const expires = new Date(announcement.expire_at)
        if (expires.getTime() < now.getTime()) {
          return false
        }
      }

      if (announcement.publish_at) {
        const publishAt = new Date(announcement.publish_at)
        if (publishAt.getTime() > now.getTime()) {
          return false
        }
      }

      return true
    })
  }

  if (context.role !== 'admin') {
    result = result.filter(announcement => announcement.status === 'published')
  }

  if (filters.limit && filters.limit > 0) {
    result = result.slice(0, filters.limit)
  }

  return result
}

export async function listAnnouncements(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  filters: AnnouncementFilters = {},
): Promise<AnnouncementRecord[]> {
  const { data, error } = await supabase
    .from('communications_announcements')
    .select('*')
    .order('publish_at', { ascending: false })

  throwIfSupabaseError(error, 'Failed to fetch announcements')

  const announcements = data ?? []

  return filterAnnouncementsForContext(context, announcements, filters)
}

export async function createAnnouncement(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  input: CreateAnnouncementInput,
): Promise<AnnouncementRecord> {
  requireRole(context, ['admin'])

  const payload = {
    title: input.title.trim(),
    body: input.body.trim(),
    status: input.status ?? 'draft',
    publish_at: input.publishAt ?? null,
    expire_at: input.expireAt ?? null,
    target_roles: input.targetRoles ?? null,
    created_by: context.userId,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('communications_announcements')
    .insert(payload)
    .select('*')
    .single()

  throwIfSupabaseError(error, 'Failed to create announcement')

  if (!data) {
    throw new HttpError(500, 'Announcement creation returned no data')
  }

  return data
}

export async function updateAnnouncement(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  input: UpdateAnnouncementInput,
): Promise<AnnouncementRecord> {
  requireRole(context, ['admin'])

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof input.title === 'string') {
    updates.title = input.title.trim()
  }

  if (typeof input.body === 'string') {
    updates.body = input.body.trim()
  }

  if (input.status) {
    updates.status = input.status
  }

  if ('publishAt' in input) {
    updates.publish_at = input.publishAt ?? null
  }

  if ('expireAt' in input) {
    updates.expire_at = input.expireAt ?? null
  }

  if ('targetRoles' in input) {
    updates.target_roles = input.targetRoles ?? null
  }

  const { data, error } = await supabase
    .from('communications_announcements')
    .update(updates)
    .eq('id', input.id)
    .select('*')
    .single()

  throwIfSupabaseError(error, 'Failed to update announcement')

  if (!data) {
    throw new HttpError(404, 'Announcement not found')
  }

  return data
}

export async function deleteAnnouncement(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  id: number,
): Promise<AnnouncementRecord> {
  requireRole(context, ['admin'])

  const { data, error } = await supabase
    .from('communications_announcements')
    .delete()
    .eq('id', id)
    .select('*')
    .single()

  throwIfSupabaseError(error, 'Failed to delete announcement')

  if (!data) {
    throw new HttpError(404, 'Announcement not found')
  }

  return data
}
