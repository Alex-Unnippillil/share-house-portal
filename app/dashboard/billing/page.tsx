import { Metadata } from "next"

import { getBillingOverview } from "./data"
import { BillingOverviewSection } from "./components/billing-overview"

export const metadata: Metadata = {
  title: "Billing & coupons",
  description: "Manage rent billing, autopay preferences, and coupon codes.",
}

export default async function BillingPage() {
  const overview = await getBillingOverview()

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Billing & coupons</h1>
        <p className="text-muted-foreground">
          Update your billing plan, confirm autopay settings, and apply coupon codes provided by your property manager.
        </p>
      </header>
      <BillingOverviewSection overview={overview} />
    </div>
  )
}

