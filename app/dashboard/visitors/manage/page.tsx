import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'

import useSupabaseServer from '@/utils/supabase-server'
import { type Tables } from '@/lib/supabase'
import { type UnitRecord } from '@/lib/visitors/repository'
import { formatStayWindow } from '@/lib/visitor-notifications'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import ManagerDecisionDialog from '../components/ManagerDecisionDialog'
import { type VisitorLogWithAudit } from '../page'

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'complete' }> = {
  pending: { label: 'Pending approval', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'complete' },
  denied: { label: 'Denied', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
  completed: { label: 'Completed', variant: 'default' },
}

export default async function ManageVisitorsPage() {
  const cookieStore = cookies()
  const supabase = useSupabaseServer(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/auth')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role ?? 'tenant'

  if (!['property_manager', 'admin'].includes(role)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Manager access required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Only property managers and admins can review and approve overnight visitor requests.
          </p>
        </CardContent>
      </Card>
    )
  }

  let unitsQuery = supabase
    .from('units')
    .select('id, building_name, unit_number, manager_profile_id')
    .order('building_name', { ascending: true })

  if (role !== 'admin') {
    unitsQuery = unitsQuery.eq('manager_profile_id', user.id)
  }

  const { data: unitsData } = await unitsQuery
  const managedUnits = (unitsData ?? []) as UnitRecord[]
  const unitIds = managedUnits.map((unit) => unit.id)

  let logsQuery = supabase
    .from('visitor_logs')
    .select(
      `*,
       host:profiles!visitor_logs_host_profile_id_fkey(full_name, email),
       unit:units(id, building_name, unit_number, manager_profile_id),
       rule:visitor_rules(id, max_consecutive_nights, max_visitors_per_month)`
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (role !== 'admin') {
    if (unitIds.length === 0) {
      logsQuery = null
    } else {
      logsQuery = logsQuery.in('unit_id', unitIds)
    }
  }

  const logsData = logsQuery ? (await logsQuery).data : []

  const logs = (logsData ?? []) as (Tables<'visitor_logs'> & {
    host?: { full_name: string | null; email: string | null } | null
    unit?: UnitRecord | null
  })[]

  const logIds = logs.map((log) => log.id)
  const auditMap = new Map<string, Tables<'visitor_audit_events'>[]>()

  if (logIds.length > 0) {
    const { data: auditData } = await supabase
      .from('visitor_audit_events')
      .select('*')
      .in('log_id', logIds)
      .order('created_at', { ascending: false })

    for (const audit of auditData ?? []) {
      const events = auditMap.get(audit.log_id) ?? []
      events.push(audit)
      auditMap.set(audit.log_id, events)
    }
  }

  const logsWithAudit: VisitorLogWithAudit[] = logs.map((log) => ({
    ...log,
    audits: auditMap.get(log.id) ?? [],
  }))

  const pendingLogs = logsWithAudit.filter((log) => log.status === 'pending')

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Manage overnight visitors</h1>
        <p className="text-sm text-muted-foreground">
          Review pending requests, coordinate with roommates, and keep an auditable trail of every decision.
        </p>
      </header>

      {role !== 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Your households</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {managedUnits.length === 0 ? (
              <p>You are not assigned to any units yet.</p>
            ) : (
              managedUnits.map((unit) => (
                <p key={unit.id}>
                  {unit.building_name} {unit.unit_number}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Pending approvals</h2>
          <p className="text-sm text-muted-foreground">
            Approve or deny requests so roommates receive timely updates.
          </p>
        </div>

        {pendingLogs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">All caught up — no pending requests right now.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pendingLogs.map((log) => {
              const status = statusLabels[log.status] ?? statusLabels.pending
              return (
                <Card key={log.id} className="shadow-sm">
                  <CardHeader className="space-y-1">
                    <CardTitle>{log.guest_full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Host: {log.host?.full_name ?? log.host?.email ?? 'Unknown'} • {formatStayWindow(log.arrival_date, log.departure_date)}
                    </p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p>
                      <span className="font-medium">Reason:</span> {log.reason ?? 'Not provided'}
                    </p>
                    <p>
                      <span className="font-medium">Submitted:</span> {format(new Date(log.created_at), 'PPpp')}
                    </p>
                    <Separator />
                    <div className="flex flex-wrap gap-2">
                      <ManagerDecisionDialog logId={log.id} guestName={log.guest_full_name} action="approve" />
                      <ManagerDecisionDialog logId={log.id} guestName={log.guest_full_name} action="deny" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Recent activity</h2>
          <p className="text-sm text-muted-foreground">
            The latest decisions and notifications across your households.
          </p>
        </div>

        {logsWithAudit.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No visitor history yet. Approvals and denials will appear here automatically.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {logsWithAudit.slice(0, 12).map((log) => {
              const status = statusLabels[log.status] ?? statusLabels.pending
              const latestEvent = log.audits[0]
              return (
                <Card key={log.id} className="shadow-sm">
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-lg">{log.guest_full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {log.unit ? `${log.unit.building_name} ${log.unit.unit_number}` : 'Unit unavailable'} • Host: {log.host?.full_name ?? log.host?.email ?? 'Unknown'}
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      Stay window: {formatStayWindow(log.arrival_date, log.departure_date)}
                    </p>
                    <p>
                      Submitted: {format(new Date(log.created_at), 'PPpp')}
                    </p>
                    {latestEvent && (
                      <p className="text-muted-foreground">
                        Last update ({format(new Date(latestEvent.created_at), 'PPpp')}): {latestEvent.message ?? latestEvent.event_type}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
