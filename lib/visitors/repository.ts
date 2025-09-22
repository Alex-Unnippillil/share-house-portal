import { type TypedSupabaseClient } from '@/utils/typed-supabase-client'
import { type Tables, type TablesInsert, type TablesUpdate } from '@/lib/supabase'

export type VisitorRuleRecord = Tables<'visitor_rules'>
export type VisitorLogRecord = Tables<'visitor_logs'>

export interface VisitorProfile {
  id: string
  full_name: string | null
  email: string | null
  role?: string | null
}

export interface UnitRecord extends Tables<'units'> {}

export interface HostContext {
  profile: VisitorProfile
  unit: UnitRecord
  rule: VisitorRuleRecord | null
  roommates: VisitorProfile[]
  manager: VisitorProfile | null
}

export async function getHostContext(
  client: TypedSupabaseClient,
  profileId: string,
): Promise<HostContext | null> {
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', profileId)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (!profile) {
    return null
  }

  const { data: membership, error: membershipError } = await client
    .from('unit_memberships')
    .select(
      `unit_id, units:units!inner(id, building_name, unit_number, manager_profile_id, timezone)`,
    )
    .eq('profile_id', profileId)
    .maybeSingle()

  if (membershipError) {
    throw membershipError
  }

  if (!membership || !membership.unit_id || !membership.units) {
    return null
  }

  const unit = membership.units as UnitRecord

  const { data: rule, error: ruleError } = await client
    .from('visitor_rules')
    .select('*')
    .eq('unit_id', unit.id)
    .order('effective_start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (ruleError) {
    throw ruleError
  }

  const { data: roommateMemberships, error: roommateError } = await client
    .from('unit_memberships')
    .select('profiles:profile_id ( id, full_name, email, role )')
    .eq('unit_id', unit.id)

  if (roommateError) {
    throw roommateError
  }

  const roommates: VisitorProfile[] =
    roommateMemberships
      ?.map((entry) => {
        const profileRow = entry.profiles as unknown as VisitorProfile | null
        if (!profileRow) {
          return null
        }
        return profileRow
      })
      .filter((profileEntry): profileEntry is VisitorProfile => Boolean(profileEntry)) ?? []

  let manager: VisitorProfile | null = null

  if (unit.manager_profile_id) {
    const { data: managerProfile, error: managerError } = await client
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', unit.manager_profile_id)
      .maybeSingle()

    if (managerError) {
      throw managerError
    }

    if (managerProfile) {
      manager = managerProfile as VisitorProfile
    }
  }

  return {
    profile: profile as VisitorProfile,
    unit,
    rule: rule ?? null,
    roommates,
    manager,
  }
}

export async function countMonthlyVisitorRequests(
  client: TypedSupabaseClient,
  params: {
    unitId: string
    hostId: string
    startDate: string
    endDate: string
  },
): Promise<number> {
  const { count, error } = await client
    .from('visitor_logs')
    .select('id', { count: 'exact', head: true })
    .eq('unit_id', params.unitId)
    .eq('host_profile_id', params.hostId)
    .gte('arrival_date', params.startDate)
    .lte('arrival_date', params.endDate)
    .in('status', ['pending', 'approved', 'completed'])

  if (error) {
    throw error
  }

  return count ?? 0
}

export async function countActiveVisitorRequests(
  client: TypedSupabaseClient,
  params: {
    unitId: string
    hostId: string
  },
): Promise<number> {
  const { count, error } = await client
    .from('visitor_logs')
    .select('id', { count: 'exact', head: true })
    .eq('unit_id', params.unitId)
    .eq('host_profile_id', params.hostId)
    .in('status', ['pending'])

  if (error) {
    throw error
  }

  return count ?? 0
}

export async function insertVisitorLog(
  client: TypedSupabaseClient,
  payload: TablesInsert<'visitor_logs'>,
): Promise<Pick<VisitorLogRecord, 'id'>> {
  const { data, error } = await client
    .from('visitor_logs')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateVisitorLog(
  client: TypedSupabaseClient,
  logId: string,
  updates: TablesUpdate<'visitor_logs'>,
): Promise<VisitorLogRecord | null> {
  const { data, error } = await client
    .from('visitor_logs')
    .update(updates)
    .eq('id', logId)
    .select('*')
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as VisitorLogRecord | null) ?? null
}

export async function getVisitorLogWithRelations(
  client: TypedSupabaseClient,
  logId: string,
): Promise<
  (VisitorLogRecord & {
    unit: UnitRecord | null
    rule: VisitorRuleRecord | null
    host: VisitorProfile | null
  }) | null
> {
  const { data, error } = await client
    .from('visitor_logs')
    .select(
      `*, unit:units!inner(id, building_name, unit_number, manager_profile_id, timezone), rule:visitor_rules(*), host:profiles!visitor_logs_host_profile_id_fkey(id, full_name, email, role)`,
    )
    .eq('id', logId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const record = data as VisitorLogRecord & {
    unit: UnitRecord | null
    rule: VisitorRuleRecord | null
    host: VisitorProfile | null
  }

  return record
}

export async function logVisitorAuditEvent(
  client: TypedSupabaseClient,
  payload: TablesInsert<'visitor_audit_events'>,
): Promise<void> {
  const { error } = await client.from('visitor_audit_events').insert(payload)

  if (error) {
    throw error
  }
}
