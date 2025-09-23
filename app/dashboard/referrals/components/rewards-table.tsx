import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import type { ReferralInvitation, ReferralRewardEntry } from "@/lib/referrals"

type InvitationLookup = Map<string, ReferralInvitation & { inviteLink: string }>

type RewardsTableProps = {
  rewards: ReferralRewardEntry[]
  invitationLookup: InvitationLookup
  currency: string
}

const rewardStatusLabels: Record<ReferralRewardEntry["status"], string> = {
  pending: "Pending",
  earned: "Earned",
  paid: "Paid",
  reversed: "Reversed",
}

function getRewardVariant(status: ReferralRewardEntry["status"]) {
  switch (status) {
    case "earned":
    case "paid":
      return "complete" as const
    case "reversed":
      return "destructive" as const
    default:
      return "secondary" as const
  }
}

const postedFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function formatPostedDate(value: string | null) {
  if (!value) {
    return "—"
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return "—"
  }

  return postedFormatter.format(parsed)
}

function formatAmount(amount: ReferralRewardEntry["amount"], status: ReferralRewardEntry["status"], currency: string) {
  const numericAmount = typeof amount === "number" ? amount : Number(amount ?? 0)
  const signed = status === "reversed" ? -Math.abs(numericAmount) : numericAmount

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    signDisplay: "auto",
  }).format(signed)
}

export function RewardsTable({ rewards, invitationLookup, currency }: RewardsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reward ledger</CardTitle>
        <CardDescription>
          Track when referral bonuses are earned, paid, or reversed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rewards.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Rewards will appear here after someone uses your invite link and completes onboarding.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b">
                <tr className="text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Reward</th>
                  <th className="py-3 pr-4 font-medium">Invitee</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Amount</th>
                  <th className="py-3 font-medium">Posted</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rewards.map((reward) => {
                  const relatedInvitation = reward.invitation_id
                    ? invitationLookup.get(reward.invitation_id)
                    : undefined

                  return (
                    <tr key={reward.id} className="align-top">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{reward.reward_type.replace(/_/g, " ")}</div>
                        {reward.description ? (
                          <div className="text-xs text-muted-foreground">{reward.description}</div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {relatedInvitation?.invitee_email ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={getRewardVariant(reward.status)}>
                          {rewardStatusLabels[reward.status]}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        {formatAmount(reward.amount, reward.status, currency)}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {formatPostedDate(reward.posted_at ?? null)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
