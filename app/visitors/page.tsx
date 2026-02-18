import { getCurrentUserRole } from "@/lib/current-user-role"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PortalPageBlueprint } from "@/components/layouts/portal-page-blueprint"
import { ManagerVisitorOversight } from "@/components/visitors/manager-visitor-oversight"
import { VisitorBookingForm } from "@/components/visitors/visitor-booking-form"

export default async function VisitorsPage() {
  const role = await getCurrentUserRole()
  const isManager = role === "property_manager" || role === "admin"

  return (
    <div className="container max-w-6xl space-y-8 py-12">
      <PortalPageBlueprint
        title="Overnight Visitor Requests"
        description="Register guest stays, enforce policy windows, and keep roommates and property staff aligned on approvals."
        metrics={[
          {
            label: "Policy model",
            value: "Consecutive-night limits",
            helperText:
              "Submission validation checks blackout windows and stay rules",
          },
          {
            label: "Decision flow",
            value: isManager
              ? "Manager approval"
              : "Roommate + manager notifications",
            helperText: "Every status transition is recorded in visitor logs",
          },
          {
            label: "Audit posture",
            value: "Action history",
            helperText: "Submission, update, and approval notes are retained",
          },
        ]}
        primaryActionTitle={
          isManager
            ? "Review pending visitor approvals"
            : "Submit a new visitor stay"
        }
        primaryActionDescription={
          isManager
            ? "Triage requests by arrival date, apply policy decisions, and keep an auditable oversight trail."
            : "Capture guest details and dates so roommates and managers can review the stay quickly."
        }
        primaryCta={
          isManager
            ? { label: "Open oversight queue", href: "#manager-oversight" }
            : { label: "Register a visitor", href: "#visitor-form" }
        }
        fallbackCta={
          isManager
            ? { label: "Open visitor form", href: "#visitor-form" }
            : { label: "Review policy details", href: "#policy-notes" }
        }
        supportModules={[
          {
            title: "Policy-aware submissions",
            description:
              "Requests are checked against consecutive-night limits, blackout windows, and unit policy rules.",
          },
          {
            title: "Notifications + audit",
            description:
              "Roommates and managers receive updates while actions are logged for compliance.",
          },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card id="visitor-form">
          <CardHeader>
            <CardTitle>Register a visitor</CardTitle>
            <CardDescription>
              Capture guest details, host roommate, and reason for the overnight
              stay.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisitorBookingForm />
          </CardContent>
        </Card>

        <Card id="policy-notes">
          <CardHeader>
            <CardTitle>Approval and policy notes</CardTitle>
            <CardDescription>
              Non-critical guidance stays compact so actions remain the visual
              priority.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Visitor requests can require manager review depending on unit
              policy.
            </p>
            <p>
              Arrival and departure windows notify roommates and property staff
              automatically for operational visibility.
            </p>
            <p>
              Decision notes stay attached to each request to support incident
              review and compliance audits.
            </p>
          </CardContent>
        </Card>
      </section>

      {isManager ? (
        <section id="manager-oversight" className="border-t pt-6">
          <ManagerVisitorOversight />
        </section>
      ) : null}
    </div>
  )
}
