import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PortalPageBlueprint } from "@/components/layouts/portal-page-blueprint"
import { MaintenanceDashboard } from "@/components/maintenance/maintenance-dashboard"
import { getCurrentUserRole } from "@/lib/current-user-role"

export default async function MaintenancePage() {
  const role = await getCurrentUserRole()
  const isManager = role === "property_manager" || role === "admin"

  return (
    <div className="container max-w-7xl space-y-8 py-12">
      <PortalPageBlueprint
        title="Maintenance Requests"
        description="Submit issues, triage severity, and monitor every assignment update in a shared operational timeline."
        metrics={[
          {
            label: "Workflow",
            value: "Shared timeline",
            helperText: "Status and assignee changes are logged as request updates",
          },
          {
            label: "Coverage",
            value: isManager ? "Portfolio-wide queue" : "Your submitted requests",
            helperText: isManager
              ? "Filter by property, unit, aging, and assignee"
              : "Track completion windows and manager responses",
          },
          {
            label: "SLA posture",
            value: "Due-soon alerts",
            helperText: "Requests are surfaced by urgency and breach risk",
          },
        ]}
        primaryActionTitle={
          isManager ? "Triage and assign maintenance work" : "Report a maintenance issue"
        }
        primaryActionDescription={
          isManager
            ? "Open the queue to prioritize incidents, assign managers, and keep SLA commitments on track."
            : "Submit a detailed request with severity and access windows to speed up resolution."
        }
        primaryCta={
          isManager
            ? { label: "Open maintenance queue", href: "#maintenance-dashboard" }
            : { label: "Create maintenance request", href: "#maintenance-dashboard" }
        }
        fallbackCta={
          isManager
            ? { label: "Review workflow notes", href: "#workflow-notes" }
            : { label: "Read request guidance", href: "#workflow-notes" }
        }
        supportModules={[
          {
            title: "Prioritization controls",
            description:
              "Requests support urgency levels and status transitions so teams can focus on high-impact issues first.",
          },
          {
            title: "Tenant communication",
            description:
              "Timeline updates keep residents informed about assignment, progress, and closure outcomes.",
          },
        ]}
      />

      <Card id="workflow-notes">
        <CardHeader>
          <CardTitle>Workflow notes</CardTitle>
          <CardDescription>
            Reference guidance is intentionally compact so the request queue remains the focal action area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Include access availability and issue severity for faster assignment.</p>
          <p>Managers can adjust status and assignee while the full timeline remains auditable.</p>
        </CardContent>
      </Card>

      <section id="maintenance-dashboard" className="border-t pt-6">
        <MaintenanceDashboard />
      </section>
    </div>
  )
}
