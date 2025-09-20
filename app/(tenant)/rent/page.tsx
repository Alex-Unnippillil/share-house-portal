import { getRentLedger } from "./actions"
import { PayRentButton } from "./components/pay-rent-button"
import { RentChargesTable } from "./components/rent-charges-table"
import { RentEmptyState } from "./components/rent-empty-state"
import { RentPaymentHistory } from "./components/rent-payment-history"
import { RentSummaryCard } from "./components/rent-summary-card"

export default async function RentPage() {
  const ledger = await getRentLedger()

  if (!ledger.lease) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Rent</h1>
          <p className="text-muted-foreground">
            Track your lease, upcoming charges, and payment history once a lease is assigned to
            your account.
          </p>
        </div>
        <RentEmptyState />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Rent</h1>
        <p className="text-muted-foreground">
          Review monthly charges, download receipts, and pay rent directly from the portal.
        </p>
      </div>
      <RentSummaryCard
        lease={ledger.lease}
        summary={ledger.summary}
        action={
          <PayRentButton
            invoiceId={ledger.summary.nextInvoiceId}
            amountDue={ledger.summary.outstandingBalance}
            disabled={!ledger.summary.nextInvoiceId}
          />
        }
      />
      <div className="space-y-6">
        <RentChargesTable invoices={ledger.invoices} />
        <RentPaymentHistory payments={ledger.payments} />
      </div>
    </div>
  )
}
