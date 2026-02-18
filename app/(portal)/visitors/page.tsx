import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ManagerVisitorOversight } from "@/components/visitors/manager-visitor-oversight"
import { VisitorBookingForm } from "@/components/visitors/visitor-booking-form"
import { createClient } from "@/utils/supabase/server"

const visitorHighlights = [
  {
    title: "Policy-aware submissions",
    description:
      "Each request is checked against consecutive-night limits, blackout windows, and unit policy rules.",
  },
  {
    title: "Approval workflow",
    description:
      "Requests can require property manager approval, with statuses and decision notes tracked in visitor logs.",
  },
  {
    title: "Notifications + audit",
    description:
      "Submission, updates, and approvals notify roommates and managers while every action is logged for oversight.",
  },
]

export default async function VisitorsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isManager = false

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    isManager = profile?.role === "property_manager" || profile?.role === "admin"
  }

  return (
    <div className="container max-w-6xl space-y-8 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Overnight Visitor Requests</h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Register guests, enforce unit policy constraints, and keep roommates and managers informed.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Register a visitor</CardTitle>
            <CardDescription>
              Capture guest details, arrival/departure, host roommate, and reason for stay.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisitorBookingForm />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {visitorHighlights.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {isManager ? <ManagerVisitorOversight /> : null}
    </div>
  )
}
