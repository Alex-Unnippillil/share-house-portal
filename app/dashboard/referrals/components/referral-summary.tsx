import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type ReferralSummaryProps = {
  totalInvites: number
  acceptedInvites: number
  pendingInvites: number
  totalRewards: number
  currency: string
}

const numberFormatter = new Intl.NumberFormat("en-US")

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

export function ReferralSummary({
  totalInvites,
  acceptedInvites,
  pendingInvites,
  totalRewards,
  currency,
}: ReferralSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Total invites</CardDescription>
          <CardTitle className="text-3xl">
            {numberFormatter.format(totalInvites)}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Accepted invites</CardDescription>
          <CardTitle className="text-3xl">
            {numberFormatter.format(acceptedInvites)}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Pending invites</CardDescription>
          <CardTitle className="text-3xl">
            {numberFormatter.format(pendingInvites)}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Total rewards</CardDescription>
          <CardTitle className="text-3xl">
            {formatCurrency(totalRewards, currency)}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}
