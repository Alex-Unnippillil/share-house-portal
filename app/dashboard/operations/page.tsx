import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requirePrivilegedAccess } from '@/lib/authz'
import { writeAuditRecord } from '@/lib/audit'
import { getBookingRows, getFinanceRows, getMaintenanceRows, getModerationRows, getOperationsKpis } from '@/lib/operations/data'

export default async function OperationsDashboardPage() {
  const { user, role } = await requirePrivilegedAccess()
  await writeAuditRecord({
    action: 'operations.dashboard.view',
    actorId: user.id,
    actorRole: role,
    targetType: 'operations_dashboard',
  })

  const [kpis, financeRows, maintenanceRows, bookingRows, moderationRows] = await Promise.all([
    getOperationsKpis(),
    getFinanceRows(),
    getMaintenanceRows(),
    getBookingRows(),
    getModerationRows(),
  ])

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Operations Command Center</h1>
        <p className="text-muted-foreground">Unified KPIs and drill-down workflows for finance, maintenance, bookings, and moderation.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.id} href={kpi.href}>
            <Card className="h-full transition hover:border-primary/40 hover:shadow-sm">
              <CardHeader>
                <CardDescription>{kpi.title}</CardDescription>
                <CardTitle className="text-3xl">{kpi.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{kpi.helper}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Operational queues</CardTitle>
            <CardDescription>Live queue counts and direct drill-down links.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Finance exceptions: {financeRows.filter((row) => row.status !== 'succeeded').length}</p>
            <p>Open maintenance: {maintenanceRows.filter((row) => row.status !== 'completed').length}</p>
            <p>Pending bookings: {bookingRows.filter((row) => row.status === 'pending').length}</p>
            <p>Unresolved moderation: {moderationRows.filter((row) => row.status === 'open').length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tools</CardTitle>
            <CardDescription>Cross-domain actions for operations users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><Link className="underline" href="/dashboard/operations/search">Global search</Link> across tenants, units, requests, payments, and documents.</p>
            <p><Link className="underline" href="/api/exports/finance">CSV export: finance</Link></p>
            <p><Link className="underline" href="/api/exports/maintenance">CSV export: maintenance</Link></p>
            <p><Link className="underline" href="/api/exports/bookings">CSV export: bookings</Link></p>
            <p><Link className="underline" href="/api/exports/visitors">CSV export: visitor logs</Link></p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
