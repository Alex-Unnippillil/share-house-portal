import { Metadata } from "next"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Maintenance",
  description: "Log household issues, track vendor status, and close the loop with roommates.",
}

const maintenanceHighlights = [
  {
    title: "Open requests",
    description: "Submit repair tickets with photos, urgency, and affected amenities so property managers can triage quickly.",
  },
  {
    title: "Status timeline",
    description: "Follow technician assignments, scheduled visits, and completion notes with automatic notifications.",
  },
  {
    title: "Preventative care",
    description: "Track seasonal chores like HVAC filter swaps or fire alarm tests and assign owners across roommates.",
  },
]

export default function MaintenancePage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Maintenance requests</h1>
        <p className="text-muted-foreground">
          Consolidate household issues in a single feed so managers, vendors, and roommates know who is responsible and when work
          wraps up.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {maintenanceHighlights.map((item) => (
          <Card key={item.title} className="h-full">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Escalation workflows ensure critical outages surface to admins immediately while routine tasks stay organised.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
