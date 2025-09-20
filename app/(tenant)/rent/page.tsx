import { loadRentOverview } from './actions'
import { ChargesTable } from './components/charges-table'
import { PayRentCard } from './components/pay-rent-card'
import { PaymentHistory } from './components/payment-history'
import { RentSummaryCard } from './components/rent-summary-card'

export default async function RentPage() {
  const overview = await loadRentOverview()
  const outstandingEntries = overview.ledger.filter((entry) => entry.balance > 0)
  const invoiceIds = outstandingEntries.map((entry) => entry.invoice.id)
  const currency =
    outstandingEntries[0]?.invoice.currency ?? overview.nextDueInvoice?.invoice.currency ?? 'usd'

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Rent</h1>
        <p className="text-sm text-muted-foreground">
          Review your lease details, understand current charges, and keep track of completed payments.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <RentSummaryCard
          lease={overview.lease}
          outstandingTotal={overview.outstandingTotal}
          nextDueInvoice={overview.nextDueInvoice}
        />
        <PayRentCard
          outstandingTotal={overview.outstandingTotal}
          currency={currency}
          invoiceIds={invoiceIds}
          nextDueDate={overview.nextDueInvoice?.invoice.due_date}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChargesTable ledger={overview.ledger} />
        </div>
        <PaymentHistory payments={overview.paymentHistory} />
      </div>
    </div>
  )
}
