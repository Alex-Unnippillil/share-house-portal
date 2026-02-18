import { MaintenanceDashboard } from "@/components/maintenance/maintenance-dashboard"
import { PageShell } from "@/components/layout/page-shell"

export default function MaintenancePage() {
  return (
    <PageShell
      title="Maintenance Requests"
      description="Submit issues with clear severity and access windows, then track every assignment and status change in a shared timeline."
      maxWidthClassName="max-w-7xl"
      className="py-10"
    >
      <MaintenanceDashboard />
    </PageShell>
  )
}
