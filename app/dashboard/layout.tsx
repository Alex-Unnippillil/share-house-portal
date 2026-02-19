import { Suspense, type ReactNode } from "react"

import { redirect } from "next/navigation"

import { CommandPalette } from "@/components/command-palette/CommandPalette"
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"
import { AssistPanelShell } from "@/components/portal/assist-panel-shell"
import { StatusCenter } from "@/components/portal/status-center"
import { PageContainer } from "@/components/ui/page-layout"
import { normalizePortalRole } from "@/lib/role-cues"
import { readUserSession } from "@/utils/actions"

import {
  getMaintenanceTickets,
  getRentSummary,
  getUpcomingBookings,
} from "./(dashboard)/data"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const { data: userSession } = await readUserSession()

  if (!userSession.session) {
    return redirect("/auth")
  }

  const roleClaim =
    userSession.session.user.app_metadata?.role ??
    userSession.session.user.user_metadata?.role
  const role = normalizePortalRole(
    typeof roleClaim === "string" ? roleClaim : null
  )

  const [rentSummary, maintenanceTickets, upcomingBookings] = await Promise.all([
    getRentSummary(),
    getMaintenanceTickets(),
    getUpcomingBookings(),
  ])

  const rentStatus =
    rentSummary.status === "paid"
      ? "paid"
      : rentSummary.status === "overdue"
      ? "failed"
      : "pending"

  const unresolvedMaintenanceCount = maintenanceTickets.filter(
    (ticket) => ticket.status !== "scheduled"
  ).length
  const bookingConflictCount = upcomingBookings.filter(
    (booking) => booking.status === "waitlisted"
  ).length

  return (
    <div className="app-backdrop w-full border border-border/70 text-foreground">
      <PageContainer variant="dashboard">
        <section className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Portal tools
              </p>
              <h2 className="text-sm font-semibold">Workspace command bar</h2>
            </div>
            <CommandPalette role={role} />
          </div>
          <StatusCenter
            rentStatus={rentStatus}
            rentLabel={rentSummary.autopayEnabled ? "Autopay active" : "Manual pay"}
            unresolvedMaintenanceCount={unresolvedMaintenanceCount}
            bookingConflictCount={bookingConflictCount}
          />
        </section>
        <ErrorBoundary>
          <Suspense fallback={<RouteSkeleton />}>
            <AssistPanelShell>{children}</AssistPanelShell>
          </Suspense>
        </ErrorBoundary>
      </PageContainer>
    </div>
  )
}
