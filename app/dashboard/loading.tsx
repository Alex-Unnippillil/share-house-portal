import {
  DashboardCardGrid,
  DashboardMainPanel,
  DashboardSectionStack,
  DashboardShellFrame,
} from "@/app/dashboard/components/layout-primitives"

export default function LoadingDashboard() {
  return (
    <DashboardShellFrame>
      <div className="hidden h-screen w-72 animate-pulse bg-muted/40 lg:block" />
      <DashboardMainPanel className="space-y-stack-lg">
        <div className="h-10 w-32 animate-pulse rounded-md bg-muted/60" />
        <DashboardCardGrid className="lg:grid-cols-3">
          <div className="h-40 animate-pulse rounded-md bg-muted/60" />
          <div className="h-40 animate-pulse rounded-md bg-muted/60" />
        </DashboardCardGrid>
        <DashboardSectionStack className="gap-card-gap">
          <div className="h-48 animate-pulse rounded-md bg-muted/60" />
        </DashboardSectionStack>
      </DashboardMainPanel>
    </DashboardShellFrame>
  )
}
