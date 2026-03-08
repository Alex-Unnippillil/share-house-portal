"use client"

import { useMemo } from "react"

import { StaffOperationsProvider } from "./staff-operations-context"
import { createSampleStaffOperationsState } from "./sample-data"
import { IncidentReportForm } from "./components/IncidentReportForm"
import { PackageIntakePanel } from "./components/PackageIntakePanel"
import { ShiftLogTimeline } from "./components/ShiftLogTimeline"
import { TimeTrackingPanel } from "./components/TimeTrackingPanel"
import { UserAcceptanceChecklist } from "./components/UserAcceptanceChecklist"
import { VisitorSignInPanel } from "./components/VisitorSignInPanel"
import { WorkOrderBoard } from "./components/WorkOrderBoard"

export const StaffOperationsDashboard = () => {
  const initialState = useMemo(() => createSampleStaffOperationsState(), [])

  return (
    <StaffOperationsProvider initialData={initialState}>
      <div className="flex flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Front-of-House Operations</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            A centralized command center for package intake, visitor management,
            maintenance coordination, and shift accountability. Designed for
            real-time collaboration across tablets and desktops.
          </p>
        </header>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="min-h-[420px]">
            <PackageIntakePanel />
          </div>
          <div className="min-h-[420px]">
            <VisitorSignInPanel />
          </div>
          <div className="xl:col-span-2 min-h-[520px]">
            <WorkOrderBoard />
          </div>
          <div className="min-h-[420px]">
            <ShiftLogTimeline />
          </div>
          <div className="min-h-[420px]">
            <TimeTrackingPanel />
          </div>
          <div className="xl:col-span-2 min-h-[480px]">
            <IncidentReportForm />
          </div>
          <div className="xl:col-span-2 min-h-[260px]">
            <UserAcceptanceChecklist />
          </div>
        </div>
      </div>
    </StaffOperationsProvider>
  )
}
