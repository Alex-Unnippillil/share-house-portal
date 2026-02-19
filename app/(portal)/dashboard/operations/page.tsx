import Link from "next/link"

import { writeAuditRecord } from "@/lib/audit"
import { requirePrivilegedAccess } from "@/lib/authz"
import {
  getBookingRows,
  getFinanceRows,
  getMaintenanceRows,
  getModerationRows,
  getOperationsKpis,
} from "@/lib/operations/data"
import { getDependencyHealth } from "@/lib/operations/dependency-health"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function OperationsDashboardPage() {
  const { user, role } = await requirePrivilegedAccess()
  await writeAuditRecord({
    action: "operations.dashboard.view",
    actorId: user.id,
    actorRole: role,
    targetType: "operations_dashboard",
  })

  const [
    kpis,
    financeRows,
    maintenanceRows,
    bookingRows,
    moderationRows,
    dependencies,
  ] = await Promise.all([
    getOperationsKpis(),
    getFinanceRows(),
    getMaintenanceRows(),
    getBookingRows(),
    getModerationRows(),
    getDependencyHealth(),
  ])

  return (
    <div className="section-stack">
      <header className="route-readable space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Operations Command Center
        </h1>
        <p className="text-muted-foreground">
          Unified KPIs and drill-down workflows for finance, maintenance,
          bookings, and moderation.
        </p>
      </header>

      <section className="grid gap-card-gap md:grid-cols-2 xl:grid-cols-4">
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

      <section className="route-readable">
        <Card>
          <CardHeader>
            <CardTitle>Dependency readiness</CardTitle>
            <CardDescription>
              Health snapshot for Supabase, Stripe, Cal.com, and Documenso
              dependencies.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            {dependencies.map((dependency) => (
              <div key={dependency.name} className="rounded-md border p-3">
                <p className="font-medium capitalize">{dependency.name}</p>
                <p
                  className={
                    dependency.status === "healthy"
                      ? "text-emerald-600"
                      : dependency.status === "degraded"
                      ? "text-amber-600"
                      : "text-red-600"
                  }
                >
                  {dependency.status}
                </p>
                <p className="text-muted-foreground">{dependency.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-card-gap xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Audit retention and export compliance</CardTitle>
            <CardDescription>
              Retention and export events are tracked to support compliance
              commitments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              All operations exports create audit records with actor, role, and
              target metadata for traceability.
            </p>
            <p>
              <Link className="underline" href="/data-retention">
                Data Retention Policy
              </Link>{" "}
              defines minimum windows for audit and export evidence.
            </p>
            <p>
              <Link className="underline" href="/privacy">
                Privacy Policy
              </Link>{" "}
              explains how operational records are used for legal and security
              obligations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational queues</CardTitle>
            <CardDescription>
              Live queue counts and direct drill-down links.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Finance exceptions:{" "}
              {
                financeRows.rows.filter((row) => row.status !== "succeeded")
                  .length
              }
            </p>
            <p>
              Open maintenance:{" "}
              {
                maintenanceRows.rows.filter((row) => row.status !== "completed")
                  .length
              }
            </p>
            <p>
              Pending bookings:{" "}
              {
                bookingRows.rows.filter((row) => row.status === "pending")
                  .length
              }
            </p>
            <p>
              Unresolved moderation:{" "}
              {
                moderationRows.rows.filter((row) => row.status === "open")
                  .length
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tools</CardTitle>
            <CardDescription>
              Cross-domain actions for operations users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Link className="underline" href="/dashboard/operations/search">
                Global search
              </Link>{" "}
              across tenants, units, requests, payments, and documents.
            </p>
            <p>
              <Link className="underline" href="/api/exports/finance">
                CSV export: finance
              </Link>
            </p>
            <p>
              <Link className="underline" href="/api/exports/maintenance">
                CSV export: maintenance
              </Link>
            </p>
            <p>
              <Link className="underline" href="/api/exports/bookings">
                CSV export: bookings
              </Link>
            </p>
            <p>
              <Link className="underline" href="/api/exports/visitors">
                CSV export: visitor logs
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
