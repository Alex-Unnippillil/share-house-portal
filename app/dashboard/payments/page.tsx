import { Metadata } from "next"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Payments",
  description: "Track rent, deposits, and shared expenses in one place.",
}

const paymentHighlights = [
  {
    title: "Autopay status",
    description:
      "See the next scheduled rent draft, update payment sources, and pause autopay if roommates need to adjust shares.",
  },
  {
    title: "Recent activity",
    description:
      "Review successful charges, catch-up payments, and refunds with receipt links for personal records.",
  },
  {
    title: "Balance alerts",
    description:
      "Monitor outstanding balances or failed payments so the household can resolve issues before late fees accrue.",
  },
]

export default function PaymentsPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Rent payments</h1>
        <p className="text-muted-foreground">
          Centralise recurring rent, utilities, and shared expenses. Stripe billing keeps every roommate’s balance up to date
          with downloadable receipts for compliance.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paymentHighlights.map((item) => (
          <Card key={item.title} className="h-full">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Data syncs in real-time from Stripe webhooks so property managers and roommates see the same ledger.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
