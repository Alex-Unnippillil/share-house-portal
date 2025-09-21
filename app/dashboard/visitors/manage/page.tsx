import { redirect } from 'next/navigation'

import { Card, CardContent } from '@/components/ui/card'
import { createSupbaseServerClient } from '@/utils/supaone'

import {
  getProfileById,
  listAuditEntriesForLogs,
  listPendingVisitorLogsForBuilding,
  mapLogToSummary,
} from '../actions/data-access'
import { ManagerVisitorQueue } from '../components/ManagerVisitorQueue'

export const dynamic = 'force-dynamic'

export default async function ManageVisitorsPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const profile = await getProfileById(supabase, user.id)
  if (!profile) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          We could not load your profile. Please contact support.
        </CardContent>
      </Card>
    )
  }

  const isManager = profile.role === 'property_manager' || profile.role === 'admin'
  if (!isManager) {
    redirect('/dashboard/visitors')
  }

  if (!profile.building_id) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          You are not assigned to a building. Assign a building to review visitor requests.
        </CardContent>
      </Card>
    )
  }

  const pendingLogs = await listPendingVisitorLogsForBuilding(
    supabase,
    profile.building_id,
  )
  const summaries = pendingLogs.map(mapLogToSummary)
  const auditEntries = await listAuditEntriesForLogs(
    supabase,
    summaries.map(log => log.id),
  )
  const auditMap = summaries.reduce<Record<number, typeof auditEntries[number][]>>(
    (acc, log) => {
      acc[log.id] = auditEntries.filter(entry => entry.logId === log.id)
      return acc
    },
    {},
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Pending visitor approvals</h1>
      <ManagerVisitorQueue logs={summaries} auditLogMap={auditMap} />
    </div>
  )
}
