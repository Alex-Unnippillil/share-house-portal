import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'

import useSupabaseServer from '@/utils/supabase-server'
import { getHostContext, type UnitRecord } from '@/lib/visitors/repository'
import { type Tables } from '@/lib/supabase'

import VisitorRuleSummary from './components/VisitorRuleSummary'
import SubmitVisitorRequestForm from './components/SubmitVisitorRequestForm'
import VisitorRequestsList from './components/VisitorRequestsList'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export type VisitorLogWithAudit = Tables<'visitor_logs'> & {
  host?: { full_name: string | null; email: string | null } | null
  unit?: UnitRecord | null
  audits: Tables<'visitor_audit_events'>[]
}

export default async function VisitorsPage() {
  const cookieStore = cookies()
  const supabase = useSupabaseServer(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/auth')
  }

  const hostContext = await getHostContext(supabase, user.id)

  if (!hostContext) {
    return (
      <Card>
        <CardContent className="p-8">
          <h2 className="text-xl font-semibold">We could not load your unit.</h2>
          <p className="mt-2 text-muted-foreground">
            Please complete onboarding or contact your property manager so we can connect you to the correct unit.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!hostContext.unit) {
    return (
      <Card>
        <CardContent className="p-8">
          <h2 className="text-xl font-semibold">Unit assignment required.</h2>
          <p className="mt-2 text-muted-foreground">
            We could not determine which household you belong to. Please reach out to your property manager.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { unit, rule } = hostContext
  const isManager = ['property_manager', 'admin'].includes(hostContext.profile.role ?? '')

  const { data: logsData } = await supabase
    .from('visitor_logs')
    .select(
      `*, host:profiles!visitor_logs_host_profile_id_fkey(full_name, email)`,
    )
    .eq('unit_id', unit.id)
    .order('arrival_date', { ascending: false })

  const logs = (logsData ?? []) as (Tables<'visitor_logs'> & {
    host?: { full_name: string | null; email: string | null } | null
  })[]

  const logIds = logs.map((log) => log.id)
  const auditMap = new Map<string, Tables<'visitor_audit_events'>[]>()

  if (logIds.length > 0) {
    const { data: auditData } = await supabase
      .from('visitor_audit_events')
      .select('*')
      .in('log_id', logIds)
      .order('created_at', { ascending: false })

    for (const event of auditData ?? []) {
      const events = auditMap.get(event.log_id) ?? []
      events.push(event)
      auditMap.set(event.log_id, events)
    }
  }

  const logsWithAudit: VisitorLogWithAudit[] = logs.map((log) => ({
    ...log,
    audits: auditMap.get(log.id) ?? [],
  }))

  const roommateCount = hostContext.roommates.filter((roommate) => roommate.id !== user.id).length

  const nextReset = format(new Date(), 'MMMM yyyy')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Overnight visitors</h1>
        <p className="mt-1 text-muted-foreground">
          Register overnight guests, review household policies, and stay in sync with your roommates and property manager.
        </p>
      </div>

      <VisitorRuleSummary
        rule={rule}
        unit={unit}
        roommates={roommateCount}
        manager={hostContext.manager}
        nextReset={nextReset}
      />

      {isManager && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
            <span className="text-muted-foreground">
              You have manager permissions for this household.
            </span>
            <Link className="font-medium text-primary hover:underline" href="/dashboard/visitors/manage">
              Open manager console
            </Link>
          </CardContent>
        </Card>
      )}

      <Separator />

      <SubmitVisitorRequestForm
        rule={rule}
        hostName={hostContext.profile.full_name ?? hostContext.profile.email ?? 'Roommate'}
      />

      <VisitorRequestsList logs={logsWithAudit} profileId={user.id} roommates={hostContext.roommates} />
    </div>
  )
}
