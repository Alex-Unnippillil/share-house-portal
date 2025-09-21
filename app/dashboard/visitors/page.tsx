import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createSupbaseServerClient } from '@/utils/supaone'

import {
  getProfileById,
  getRuleForProfile,
  listVisitorLogsForUnit,
  mapLogToSummary,
  mapRulesToSummaries,
} from './actions/data-access'
import { VisitorLogList } from './components/VisitorLogList'
import { VisitorPolicySummary } from './components/VisitorPolicySummary'
import { VisitorRequestForm } from './components/VisitorRequestForm'

export const dynamic = 'force-dynamic'

export default async function VisitorsPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          We couldn’t verify your session. Please sign in again to manage visitor requests.
        </CardContent>
      </Card>
    )
  }

  const profile = await getProfileById(supabase, user.id)
  if (!profile) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          We could not load your profile. Contact your property manager for assistance.
        </CardContent>
      </Card>
    )
  }

  const activeRule = await getRuleForProfile(supabase, profile)
  const activeRuleSummary = activeRule ? mapRulesToSummaries([activeRule])[0] : null
  const logs =
    profile.unit_id ? await listVisitorLogsForUnit(supabase, profile.unit_id) : []
  const logSummaries = logs.map(mapLogToSummary)

  const unitLabel = profile.unit_id ?? 'Unassigned'
  const buildingLabel = profile.building_id ?? null
  const isManager = profile.role === 'property_manager' || profile.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Visitor stays</h1>
        {isManager ? (
          <Button asChild variant="outline">
            <Link href="/dashboard/visitors/manage">Review pending requests</Link>
          </Button>
        ) : null}
      </div>
      <VisitorPolicySummary
        rule={activeRuleSummary}
        unitLabel={unitLabel}
        buildingLabel={buildingLabel}
      />
      <VisitorRequestForm activeRule={activeRuleSummary} />
      <VisitorLogList logs={logSummaries} currentProfileId={profile.id} />
    </div>
  )
}
