import { PurchaseSettlement } from "@/components/payments/purchase-settlement"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const paymentHighlights = [
  {
    title: "AutoPay scheduling",
    description:
      "Enable recurring rent collection with configurable due dates, grace periods, and automatic late fee handling.",
  },
  {
    title: "One-time catch up",
    description:
      "Support partial or one-off payments so roommates can settle balances without waiting for the next billing cycle.",
  },
  {
    title: "Receipt history",
    description:
      "Download itemized receipts and export payment history for reimbursement, tax, or dispute resolution needs.",
  },
  {
    title: "Shared ledger",
    description:
      "Track individual roommate contributions alongside property manager adjustments to maintain full transparency.",
  },
]

export default function PaymentsPage() {
  return (
    <div className="container max-w-5xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Payments</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Manage rent, deposits, and roommate contributions with Stripe-powered autopay and real-time status updates.
          </p>
        </div>
        <Separator />
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {paymentHighlights.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <PurchaseSettlement />
    </div>
  )
}
