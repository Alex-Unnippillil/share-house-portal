import type { PostgrestSingleResponse } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'
import type {
  ProfileRow,
  ProfileSummary,
  VisitorAuditEntryView,
  VisitorAuditRow,
  VisitorLogRow,
  VisitorLogSummary,
  VisitorLogWithRelations,
  VisitorRuleRow,
  VisitorRuleSummary,
} from '@/types/visitors'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

const VISITOR_RULE_COLUMNS =
  'id, title, description, building_id, unit_id, max_consecutive_nights, max_visits_per_month, require_manager_approval, advance_notice_hours, created_at, updated_at, created_by, active, metadata'

const VISITOR_LOG_COLUMNS =
  'id, host_profile_id, building_id, unit_id, visitor_name, visitor_email, arrival_date, departure_date, total_nights, reason, status, rule_id, approval_notes, approved_by, approved_at, cancellation_reason, cancelled_at, cancelled_by, metadata, created_at, updated_at'

const VISITOR_LOG_WITH_RELATIONS =
  `${VISITOR_LOG_COLUMNS}, rule:visitor_rules!visitor_logs_rule_id_fkey(${VISITOR_RULE_COLUMNS}), host:profiles!visitor_logs_host_profile_id_fkey(id, full_name, email, role, building_id, unit_id)`

const AUDIT_COLUMNS = 'id, log_id, actor_profile_id, action, notes, metadata, created_at'

export type VisitorLogInsert = Database['public']['Tables']['visitor_logs']['Insert']
export type VisitorLogUpdate = Database['public']['Tables']['visitor_logs']['Update']
export type VisitorAuditInsert = Database['public']['Tables']['visitor_log_audits']['Insert']

function ensureSuccess<T>(response: PostgrestSingleResponse<T>): T {
  if (response.error) {
    throw new Error(response.error.message)
  }

  return response.data as T
}

export async function getProfileById(
  client: TypedSupabaseClient,
  profileId: string,
): Promise<ProfileSummary | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, email, role, building_id, unit_id')
    .eq('id', profileId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as ProfileSummary | null
}

export async function listRulesForProfile(
  client: TypedSupabaseClient,
  profile: ProfileSummary,
): Promise<VisitorRuleRow[]> {
  const query = client
    .from('visitor_rules')
    .select(VISITOR_RULE_COLUMNS)
    .eq('active', true)
    .eq('building_id', profile.building_id)

  if (profile.unit_id) {
    query.or(`unit_id.eq.${profile.unit_id},unit_id.is.null`)
  } else {
    query.is('unit_id', null)
  }

  const { data, error } = await query.order('unit_id', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as VisitorRuleRow[]
}

export async function getRuleForProfile(
  client: TypedSupabaseClient,
  profile: ProfileSummary,
  ruleId?: number | null,
): Promise<VisitorRuleRow | null> {
  if (ruleId) {
    const { data, error } = await client
      .from('visitor_rules')
      .select(VISITOR_RULE_COLUMNS)
      .eq('id', ruleId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!data) return null

    const rule = data as VisitorRuleRow
    if (
      rule.building_id !== profile.building_id ||
      (rule.unit_id && profile.unit_id && rule.unit_id !== profile.unit_id)
    ) {
      return null
    }

    if (rule.unit_id && !profile.unit_id) {
      return null
    }

    return rule
  }

  const rules = await listRulesForProfile(client, profile)
  if (!rules.length) {
    return null
  }

  const unitSpecific = profile.unit_id
    ? rules.find(rule => rule.unit_id === profile.unit_id)
    : null

  return unitSpecific ?? rules[0]
}

export async function insertVisitorLog(
  client: TypedSupabaseClient,
  payload: VisitorLogInsert,
): Promise<VisitorLogRow> {
  const response = await client
    .from('visitor_logs')
    .insert(payload)
    .select(VISITOR_LOG_COLUMNS)
    .single()

  return ensureSuccess(response) as VisitorLogRow
}

export async function updateVisitorLog(
  client: TypedSupabaseClient,
  logId: number,
  changes: VisitorLogUpdate,
): Promise<VisitorLogRow> {
  const response = await client
    .from('visitor_logs')
    .update(changes)
    .eq('id', logId)
    .select(VISITOR_LOG_COLUMNS)
    .single()

  return ensureSuccess(response) as VisitorLogRow
}

export async function getVisitorLogWithRelations(
  client: TypedSupabaseClient,
  logId: number,
): Promise<VisitorLogWithRelations | null> {
  const { data, error } = await client
    .from('visitor_logs')
    .select(VISITOR_LOG_WITH_RELATIONS)
    .eq('id', logId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data as VisitorLogWithRelations | null) ?? null
}

export async function insertVisitorAudit(
  client: TypedSupabaseClient,
  entry: VisitorAuditInsert,
): Promise<VisitorAuditRow> {
  const response = await client
    .from('visitor_log_audits')
    .insert(entry)
    .select(AUDIT_COLUMNS)
    .single()

  return ensureSuccess(response) as VisitorAuditRow
}

export async function listRoommatesForUnit(
  client: TypedSupabaseClient,
  unitId: string,
  excludeProfileId?: string,
): Promise<ProfileSummary[]> {
  const query = client
    .from('profiles')
    .select('id, full_name, email, role, building_id, unit_id')
    .eq('unit_id', unitId)
    .in('role', ['tenant', 'roommate'])

  if (excludeProfileId) {
    query.neq('id', excludeProfileId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as ProfileSummary[]
}

export async function listManagersForBuilding(
  client: TypedSupabaseClient,
  buildingId: string,
): Promise<ProfileSummary[]> {
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, email, role, building_id, unit_id')
    .eq('building_id', buildingId)
    .in('role', ['property_manager', 'admin'])

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as ProfileSummary[]
}

export async function listVisitorLogsForUnit(
  client: TypedSupabaseClient,
  unitId: string,
): Promise<VisitorLogWithRelations[]> {
  const { data, error } = await client
    .from('visitor_logs')
    .select(VISITOR_LOG_WITH_RELATIONS)
    .eq('unit_id', unitId)
    .order('arrival_date', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as VisitorLogWithRelations[]
}

export async function listPendingVisitorLogsForBuilding(
  client: TypedSupabaseClient,
  buildingId: string,
): Promise<VisitorLogWithRelations[]> {
  const { data, error } = await client
    .from('visitor_logs')
    .select(VISITOR_LOG_WITH_RELATIONS)
    .eq('building_id', buildingId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as VisitorLogWithRelations[]
}

export async function listAuditEntriesForLogs(
  client: TypedSupabaseClient,
  logIds: number[],
): Promise<VisitorAuditEntryView[]> {
  if (!logIds.length) return []

  const { data, error } = await client
    .from('visitor_log_audits')
    .select(
      `${AUDIT_COLUMNS}, actor:profiles!visitor_log_audits_actor_profile_id_fkey(full_name, role)`,
    )
    .in('log_id', logIds)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(entry => {
    const record = entry as VisitorAuditRow & {
      actor?: Pick<ProfileRow, 'full_name' | 'role'> | null
    }

    return {
      id: record.id,
      logId: record.log_id,
      action: record.action,
      notes: record.notes,
      createdAt: record.created_at,
      actorName: record.actor?.full_name ?? null,
      actorRole: record.actor?.role ?? null,
      metadata: (record.metadata as Record<string, unknown> | null) ?? null,
    }
  })
}

function mapRuleToSummary(rule: VisitorRuleRow): VisitorRuleSummary {
  return {
    id: rule.id,
    title: rule.title,
    description: rule.description ?? null,
    buildingId: rule.building_id,
    unitId: rule.unit_id ?? null,
    maxConsecutiveNights: rule.max_consecutive_nights,
    maxVisitsPerMonth: rule.max_visits_per_month ?? null,
    requireManagerApproval: rule.require_manager_approval,
    advanceNoticeHours: rule.advance_notice_hours ?? null,
  }
}

export function mapLogToSummary(
  log: VisitorLogWithRelations,
): VisitorLogSummary {
  return {
    id: log.id,
    visitorName: log.visitor_name,
    visitorEmail: log.visitor_email ?? null,
    arrivalDate: log.arrival_date,
    departureDate: log.departure_date,
    totalNights: log.total_nights,
    status: log.status,
    reason: log.reason ?? null,
    rule: log.rule ? mapRuleToSummary(log.rule) : null,
    hostId: log.host_profile_id,
    hostName: log.host?.full_name ?? null,
    hostEmail: log.host?.email ?? null,
    approvalNotes: log.approval_notes ?? null,
    approvedAt: log.approved_at ?? null,
    cancellationReason: log.cancellation_reason ?? null,
    cancelledAt: log.cancelled_at ?? null,
    createdAt: log.created_at,
    updatedAt: log.updated_at,
  }
}

export function mapRulesToSummaries(rules: VisitorRuleRow[]): VisitorRuleSummary[] {
  return rules.map(mapRuleToSummary)
}

export function createVisitorRequestDependencies(
  client: TypedSupabaseClient,
  profile: ProfileSummary,
) {
  return {
    profile,
    fetchRule: (ruleId?: number | null) => getRuleForProfile(client, profile, ruleId),
    insertLog: (payload: VisitorLogInsert) => insertVisitorLog(client, payload),
    createAudit: (entry: VisitorAuditInsert) => insertVisitorAudit(client, entry),
    listRoommates: (unitId: string, exclude?: string) =>
      listRoommatesForUnit(client, unitId, exclude),
    listManagers: (buildingId: string) => listManagersForBuilding(client, buildingId),
  }
}

export function createCancelDependencies(
  client: TypedSupabaseClient,
  actor: ProfileSummary,
) {
  return {
    actor,
    getLog: (logId: number) => getVisitorLogWithRelations(client, logId),
    updateLog: (logId: number, changes: VisitorLogUpdate) =>
      updateVisitorLog(client, logId, changes),
    createAudit: (entry: VisitorAuditInsert) => insertVisitorAudit(client, entry),
    listRoommates: (unitId: string, exclude?: string) =>
      listRoommatesForUnit(client, unitId, exclude),
    listManagers: (buildingId: string) => listManagersForBuilding(client, buildingId),
  }
}

export function createResolveDependencies(
  client: TypedSupabaseClient,
  actor: ProfileSummary,
) {
  return {
    actor,
    getLog: (logId: number) => getVisitorLogWithRelations(client, logId),
    updateLog: (logId: number, changes: VisitorLogUpdate) =>
      updateVisitorLog(client, logId, changes),
    createAudit: (entry: VisitorAuditInsert) => insertVisitorAudit(client, entry),
    listRoommates: (unitId: string, exclude?: string) =>
      listRoommatesForUnit(client, unitId, exclude),
    listManagers: (buildingId: string) => listManagersForBuilding(client, buildingId),
  }
}
