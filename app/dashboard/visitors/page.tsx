import { Metadata } from "next"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Visitors",
  description: "Manage overnight guest approvals and history across the household.",
}

const visitorHighlights = [
  {
    title: "Stay requests",
    description: "Capture arrival and departure details with host roommate information and policy acknowledgements.",
  },
  {
    title: "Policy enforcement",
    description: "Limit back-to-back visits and send reminders when guests approach maximum stay limits.",
  },
  {
    title: "Audit trail",
    description: "Maintain a searchable log of guest activity for security reviews and compliance reporting.",
  },
]

export default function VisitorsPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Visitor log</h1>
        <p className="text-muted-foreground">
          Keep property managers informed about who is staying overnight while giving roommates visibility into upcoming guests and
          past visits.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visitorHighlights.map((item) => (
          <Card key={item.title} className="h-full">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visitor data syncs with bookings and messaging so the entire household receives timely updates.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
