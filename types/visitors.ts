import type { Database } from '@/lib/supabase'

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type VisitorRuleRow = Database['public']['Tables']['visitor_rules']['Row']
export type VisitorLogRow = Database['public']['Tables']['visitor_logs']['Row']
export type VisitorAuditRow = Database['public']['Tables']['visitor_log_audits']['Row']

export type ProfileSummary = Pick<
  ProfileRow,
  'id' | 'full_name' | 'email' | 'role' | 'building_id' | 'unit_id'
>

export type VisitorRuleSummary = {
  id: number
  title: string
  description: string | null
  buildingId: string
  unitId: string | null
  maxConsecutiveNights: number
  maxVisitsPerMonth: number | null
  requireManagerApproval: boolean
  advanceNoticeHours: number | null
}

export type VisitorLogSummary = {
  id: number
  visitorName: string
  visitorEmail: string | null
  arrivalDate: string
  departureDate: string
  totalNights: number
  status: string
  reason: string | null
  rule: VisitorRuleSummary | null
  hostId: string
  hostName: string | null
  hostEmail: string | null
  approvalNotes: string | null
  approvedAt: string | null
  cancellationReason: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
}

export type VisitorAuditEntryView = {
  id: number
  logId: number
  action: string
  notes: string | null
  createdAt: string
  actorName: string | null
  actorRole: string | null
  metadata: Record<string, unknown> | null
}

export type VisitorLogWithRelations = VisitorLogRow & {
  rule?: VisitorRuleRow | null
  host?: ProfileSummary | null
}
