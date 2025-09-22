import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { loadDashboardKpis } from "@/lib/dashboard-kpis"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

export default async function DashboardPage() {
  const supabase = await createSupbaseServerClientReadOnly()

  let kpis: Awaited<ReturnType<typeof loadDashboardKpis>> | null = null
  let kpiError: string | null = null

  try {
    kpis = await loadDashboardKpis(supabase)
  } catch (error) {
    console.error("Failed to load dashboard KPIs", error)
    kpiError = "We couldn't load the latest household metrics."
  }

  const metricCards = [
    {
      title: "Rent collected this month",
      value: kpis ? currencyFormatter.format(kpis.totalRentCollectedThisMonth) : "—",
      helper: "Successful payments recorded this billing cycle.",
    },
    {
      title: "Overdue rent payments",
      value: kpis ? kpis.overdueRentPayments.toString() : "—",
      helper: "Payments pending or failed beyond their due date.",
    },
    {
      title: "Active leases",
      value: kpis ? kpis.activeLeases.toString() : "—",
      helper: "Leases currently marked as active in the system.",
    },
    {
      title: "Open maintenance requests",
      value: kpis ? kpis.openMaintenanceRequests.toString() : "—",
      helper: "Requests awaiting completion or in progress.",
    },
    {
      title: "Visitors in next 7 days",
      value: kpis ? kpis.upcomingVisitorsNext7Days.toString() : "—",
      helper: "Approved or pending visitor stays scheduled soon.",
    },
    {
      title: "Documents awaiting signature",
      value: kpis ? kpis.pendingDocumentsAwaitingSignature.toString() : "—",
      helper: "Draft or pending documents that still require signatures.",
    },
  ]

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          {kpis && (
            <p className="mt-1 text-sm text-muted-foreground">
              KPIs loaded from {kpis.source} in {kpis.loadTimeMs.toFixed(1)} ms. Last updated{" "}
              {new Date(kpis.computedAt).toLocaleString()}.
            </p>
          )}
          {kpis?.cacheError && (
            <p className="mt-1 text-sm text-amber-600">Last refresh warning: {kpis.cacheError}</p>
          )}
          {kpiError && <p className="mt-1 text-sm text-destructive">{kpiError}</p>}
        </div>
        <div className="flex gap-2">
          <Link href="/payments">
            <Button size="sm">Pay rent</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((metric) => (
          <Card key={metric.title}>
            <CardHeader>
              <CardTitle>{metric.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{metric.value}</div>
              <p className="mt-2 text-sm text-muted-foreground">{metric.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roommate board</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>Jordan: Wi-Fi is down, rebooted router.</li>
            <li>Avery: Parking spot swap this weekend?</li>
          </ul>
          <Link href="/messaging" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Go to messages
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
