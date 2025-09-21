import { notFound } from 'next/navigation'

import { VisitorRequestForm } from '@/app/dashboard/visitors/components/VisitorRequestForm'
import {
  handleCreateVisitorRequest,
  visitorActionInitialState,
  visitorRequestFormSchema,
  type VisitorActionState,
} from '@/app/dashboard/visitors/actions/shared'
import type {
  ProfileSummary,
  VisitorAuditRow,
  VisitorLogRow,
  VisitorRuleRow,
  VisitorRuleSummary,
} from '@/types/visitors'

const hostProfile: ProfileSummary = {
  id: 'host-1',
  full_name: 'Host One',
  email: 'host@example.com',
  role: 'tenant',
  building_id: 'building-1',
  unit_id: 'unit-1',
}

const ruleRow: VisitorRuleRow = {
  id: 99,
  title: 'Test policy',
  description: 'Guests may stay up to three consecutive nights.',
  building_id: 'building-1',
  unit_id: 'unit-1',
  max_consecutive_nights: 3,
  max_visits_per_month: null,
  require_manager_approval: true,
  advance_notice_hours: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: hostProfile.id,
  active: true,
  metadata: {},
}

const ruleSummary: VisitorRuleSummary = {
  id: ruleRow.id,
  title: ruleRow.title,
  description: ruleRow.description,
  buildingId: ruleRow.building_id,
  unitId: ruleRow.unit_id,
  maxConsecutiveNights: ruleRow.max_consecutive_nights,
  maxVisitsPerMonth: ruleRow.max_visits_per_month,
  requireManagerApproval: ruleRow.require_manager_approval,
  advanceNoticeHours: ruleRow.advance_notice_hours,
}

const roommates: ProfileSummary[] = [
  {
    id: 'roommate-2',
    full_name: 'Roommate Two',
    email: 'roomie@example.com',
    role: 'tenant',
    building_id: 'building-1',
    unit_id: 'unit-1',
  },
]

const managers: ProfileSummary[] = [
  {
    id: 'manager-1',
    full_name: 'Manager One',
    email: 'manager@example.com',
    role: 'property_manager',
    building_id: 'building-1',
    unit_id: null,
  },
]

const logs: VisitorLogRow[] = []
const audits: VisitorAuditRow[] = []

async function submitTestVisitorRequest(
  _prevState: VisitorActionState = visitorActionInitialState,
  formData?: FormData,
): Promise<VisitorActionState> {
  'use server'

  if (!formData) {
    return {
      status: 'error',
      message: 'No form data received.',
    }
  }

  const raw = {
    visitorName: formData.get('visitorName'),
    visitorEmail: formData.get('visitorEmail'),
    arrivalDate: formData.get('arrivalDate'),
    departureDate: formData.get('departureDate'),
    reason: formData.get('reason'),
    ruleId: Number(formData.get('ruleId')), // hidden input ensures this exists
  }

  const parsed = visitorRequestFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please correct the highlighted issues and try again.',
      issues: parsed.error.flatten().fieldErrors,
    }
  }

  return handleCreateVisitorRequest(
    {
      profile: hostProfile,
      fetchRule: async () => ruleRow,
      insertLog: async payload => {
        const now = new Date().toISOString()
        const record: VisitorLogRow = {
          id: logs.length + 1,
          created_at: now,
          updated_at: now,
          host_profile_id: payload.host_profile_id ?? hostProfile.id,
          building_id: payload.building_id ?? hostProfile.building_id!,
          unit_id: payload.unit_id ?? hostProfile.unit_id!,
          visitor_name: payload.visitor_name,
          visitor_email: payload.visitor_email,
          arrival_date: payload.arrival_date,
          departure_date: payload.departure_date,
          total_nights: payload.total_nights ?? 0,
          reason: payload.reason ?? null,
          status: payload.status ?? 'pending',
          rule_id: payload.rule_id ?? ruleRow.id,
          approval_notes: payload.approval_notes ?? null,
          approved_by: payload.approved_by ?? null,
          approved_at: payload.approved_at ?? null,
          cancelled_by: payload.cancelled_by ?? null,
          cancelled_at: payload.cancelled_at ?? null,
          cancellation_reason: payload.cancellation_reason ?? null,
          metadata: (payload.metadata as Record<string, unknown>) ?? {},
        }
        logs.unshift(record)
        return record
      },
      createAudit: async entry => {
        const audit: VisitorAuditRow = {
          id: audits.length + 1,
          log_id: entry.log_id,
          actor_profile_id: entry.actor_profile_id,
          action: entry.action,
          notes: entry.notes ?? null,
          metadata: (entry.metadata as Record<string, unknown>) ?? {},
          created_at: new Date().toISOString(),
        }
        audits.push(audit)
        return audit
      },
      listRoommates: async () => roommates,
      listManagers: async () => managers,
    },
    parsed.data,
    async () => {},
  )
}

export default function VisitorFlowTestPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Visitor request test harness</h1>
        <p className="text-sm text-muted-foreground">
          Use this page to exercise the overnight visitor request form during automated tests.
        </p>
      </div>
      <VisitorRequestForm activeRule={ruleSummary} submitAction={submitTestVisitorRequest} />
    </main>
  )
}
