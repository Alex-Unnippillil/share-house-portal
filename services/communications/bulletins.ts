import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'
import { HttpError, throwIfSupabaseError } from './errors'
import {
  type BulletinFilters,
  type BulletinListResult,
  type BulletinRecord,
  type AbuseReportRecord,
  type CreateBulletinInput,
  type ModerateBulletinInput,
  type ReportAbuseInput,
  type RequestContext,
} from './types'
import { isAdmin, requireRole } from './auth'

function filterBulletins(
  bulletins: BulletinRecord[],
  context: RequestContext,
  filters: BulletinFilters,
): BulletinRecord[] {
  let result = bulletins

  if (filters.status) {
    result = result.filter(bulletin => bulletin.status === filters.status)
  }

  if (filters.moderationStatus) {
    result = result.filter(
      bulletin => bulletin.moderation_status === filters.moderationStatus,
    )
  }

  if (filters.mineOnly) {
    result = result.filter(bulletin => bulletin.author_id === context.userId)
  }

  if (!isAdmin(context)) {
    result = result.filter(bulletin => {
      const isOwner = bulletin.author_id === context.userId
      const isVisible =
        bulletin.status === 'approved' || bulletin.status === 'escalated'

      return isOwner || isVisible
    })
  }

  return result
}

async function attachAbuseContext(
  supabase: TypedSupabaseClient,
  bulletins: BulletinRecord[],
): Promise<BulletinListResult> {
  if (bulletins.length === 0) {
    return { bulletins }
  }

  const bulletinIds = bulletins.map(bulletin => bulletin.id)
  const { data: reports, error } = await supabase
    .from('communications_abuse_reports')
    .select('*')
    .in('bulletin_id', bulletinIds)

  throwIfSupabaseError(error, 'Failed to fetch abuse reports')

  if (!reports) {
    return { bulletins }
  }

  const summary: BulletinListResult['abuseSummary'] = {}
  const enhanced = bulletins.map(bulletin => {
    const related = reports.filter(report => report.bulletin_id === bulletin.id)

    if (related.length === 0) {
      return bulletin
    }

    summary[bulletin.id] = related.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] ?? 0) + 1
      return acc
    }, {} as NonNullable<BulletinListResult['abuseSummary']>[number])

    return {
      ...bulletin,
      abuseReports: related,
    }
  })

  return { bulletins: enhanced, abuseSummary: summary }
}

export async function listBulletins(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  filters: BulletinFilters = {},
): Promise<BulletinListResult> {
  const { data, error } = await supabase
    .from('communications_bulletins')
    .select('*')
    .order('created_at', { ascending: false })

  throwIfSupabaseError(error, 'Failed to fetch bulletins')

  const bulletins = filterBulletins(data ?? [], context, filters)

  if (filters.includeAbuse && isAdmin(context)) {
    return attachAbuseContext(supabase, bulletins)
  }

  return { bulletins }
}

export async function createBulletin(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  input: CreateBulletinInput,
): Promise<BulletinRecord> {
  const payload = {
    title: input.title.trim(),
    content: input.content.trim(),
    author_id: context.userId,
    status: 'pending' as BulletinRecord['status'],
    moderation_status: 'clean' as BulletinRecord['moderation_status'],
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('communications_bulletins')
    .insert(payload)
    .select('*')
    .single()

  throwIfSupabaseError(error, 'Failed to create bulletin')

  if (!data) {
    throw new HttpError(500, 'Bulletin creation returned no data')
  }

  const { error: auditError } = await supabase
    .from('communications_bulletin_audits')
    .insert({
      bulletin_id: data.id,
      actor_id: context.userId,
      action: 'submit',
      metadata: { title: data.title },
    })

  throwIfSupabaseError(auditError, 'Failed to record bulletin submission')

  return data
}

export async function reportBulletinAbuse(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  input: ReportAbuseInput,
): Promise<AbuseReportRecord> {
  const { data: bulletin, error: fetchError } = await supabase
    .from('communications_bulletins')
    .select('id, author_id, moderation_status')
    .eq('id', input.bulletinId)
    .maybeSingle()

  throwIfSupabaseError(fetchError, 'Failed to load bulletin')

  if (!bulletin) {
    throw new HttpError(404, 'Bulletin not found')
  }

  if (bulletin.author_id === context.userId) {
    throw new HttpError(400, 'Authors cannot report their own bulletins')
  }

  const { data: existingReport, error: existingError } = await supabase
    .from('communications_abuse_reports')
    .select('id, status')
    .eq('bulletin_id', input.bulletinId)
    .eq('reporter_id', context.userId)
    .not('status', 'eq', 'resolved')
    .maybeSingle()

  throwIfSupabaseError(existingError, 'Failed to verify abuse report history')

  if (existingReport) {
    throw new HttpError(409, 'An open abuse report already exists for this bulletin')
  }

  const now = new Date().toISOString()
  const { data: report, error: reportError } = await supabase
    .from('communications_abuse_reports')
    .insert({
      bulletin_id: input.bulletinId,
      reporter_id: context.userId,
      reason: input.reason.trim(),
      details: input.details ?? null,
      updated_at: now,
    })
    .select('*')
    .single()

  throwIfSupabaseError(reportError, 'Failed to submit abuse report')

  const { error: bulletinUpdateError } = await supabase
    .from('communications_bulletins')
    .update({
      moderation_status: 'under_review',
      abuse_reason: input.reason,
      abuse_context: {
        details: input.details ?? null,
        reported_at: now,
        reported_by: context.userId,
      },
      updated_at: now,
    })
    .eq('id', input.bulletinId)

  throwIfSupabaseError(bulletinUpdateError, 'Failed to update bulletin moderation state')

  const { error: auditError } = await supabase
    .from('communications_bulletin_audits')
    .insert({
      bulletin_id: input.bulletinId,
      actor_id: context.userId,
      action: 'flag',
      notes: input.details ?? undefined,
    })

  throwIfSupabaseError(auditError, 'Failed to log abuse report action')

  return report
}

export async function moderateBulletin(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  input: ModerateBulletinInput,
): Promise<void> {
  requireRole(context, ['admin'])

  const { data: bulletin, error: fetchError } = await supabase
    .from('communications_bulletins')
    .select('*')
    .eq('id', input.bulletinId)
    .maybeSingle()

  throwIfSupabaseError(fetchError, 'Failed to load bulletin for moderation')

  if (!bulletin) {
    throw new HttpError(404, 'Bulletin not found')
  }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    moderated_by: context.userId,
    moderated_at: now,
    updated_at: now,
  }

  let abuseStatusUpdate: 'resolved' | 'investigating' | null = null

  switch (input.action) {
    case 'approve':
      updates.status = 'approved'
      updates.moderation_status = 'resolved'
      updates.abuse_reason = null
      updates.abuse_context = null
      abuseStatusUpdate = 'resolved'
      break
    case 'reject':
      updates.status = 'rejected'
      updates.moderation_status = 'action_required'
      abuseStatusUpdate = 'investigating'
      break
    case 'escalate':
      updates.status = 'escalated'
      updates.moderation_status = 'under_review'
      abuseStatusUpdate = 'investigating'
      break
    case 'resolve':
      updates.moderation_status = 'resolved'
      abuseStatusUpdate = 'resolved'
      break
    default:
      throw new HttpError(400, `Unsupported moderation action: ${input.action}`)
  }

  const { error: updateError } = await supabase
    .from('communications_bulletins')
    .update(updates)
    .eq('id', input.bulletinId)

  throwIfSupabaseError(updateError, 'Failed to update bulletin status')

  if (abuseStatusUpdate) {
    const reportUpdate: Record<string, unknown> = {
      status: abuseStatusUpdate,
      updated_at: now,
    }

    if (abuseStatusUpdate === 'resolved') {
      reportUpdate.resolved_at = now
      if (input.resolutionNotes) {
        reportUpdate.resolution_notes = input.resolutionNotes
      }
    }

    const { error: abuseUpdateError } = await supabase
      .from('communications_abuse_reports')
      .update(reportUpdate)
      .eq('bulletin_id', input.bulletinId)
      .neq('status', 'resolved')

    throwIfSupabaseError(abuseUpdateError, 'Failed to update abuse reports')
  }

  const { error: auditError } = await supabase
    .from('communications_bulletin_audits')
    .insert({
      bulletin_id: input.bulletinId,
      actor_id: context.userId,
      action: input.action,
      notes: input.notes ?? undefined,
      metadata: input.resolutionNotes
        ? { resolution_notes: input.resolutionNotes }
        : undefined,
    })

  throwIfSupabaseError(auditError, 'Failed to create moderation audit trail')
}

export async function deleteBulletin(
  supabase: TypedSupabaseClient,
  context: RequestContext,
  id: number,
): Promise<BulletinRecord> {
  const { data: existing, error } = await supabase
    .from('communications_bulletins')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  throwIfSupabaseError(error, 'Failed to load bulletin')

  if (!existing) {
    throw new HttpError(404, 'Bulletin not found')
  }

  if (!isAdmin(context) && existing.author_id !== context.userId) {
    throw new HttpError(403, 'Only admins or authors can remove bulletins')
  }

  const { data: removed, error: deleteError } = await supabase
    .from('communications_bulletins')
    .delete()
    .eq('id', id)
    .select('*')
    .single()

  throwIfSupabaseError(deleteError, 'Failed to delete bulletin')

  if (!removed) {
    throw new HttpError(500, 'Bulletin removal returned no data')
  }

  const { error: auditError } = await supabase
    .from('communications_bulletin_audits')
    .insert({
      bulletin_id: id,
      actor_id: context.userId,
      action: 'resolve',
      notes: 'Bulletin deleted',
    })

  throwIfSupabaseError(auditError, 'Failed to record bulletin deletion')

  return removed
}
