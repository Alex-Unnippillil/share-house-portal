import { redirect } from "next/navigation"

import { Gift, Link2, Users } from "lucide-react"

import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import { loadReferralDashboardData } from "./loaders"
import { ShareLinkInput } from "./ShareLinkInput"

const STATUS_METADATA: Record<
  string,
  {
    label: string
    description: string
    variant: BadgeProps["variant"]
  }
> = {
  invited: {
    label: "Invited",
    description: "Waiting for signup",
    variant: "outline",
  },
  signed_up: {
    label: "Signed up",
    description: "Account created",
    variant: "secondary",
  },
  qualified: {
    label: "Qualified",
    description: "Reward ready",
    variant: "default",
  },
  rewarded: {
    label: "Rewarded",
    description: "Payout sent",
    variant: "complete",
  },
  cancelled: {
    label: "Cancelled",
    description: "Invite withdrawn",
    variant: "destructive",
  },
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export default async function ReferralDashboardPage() {
  const data = await loadReferralDashboardData()

  if (!data.user) {
    redirect("/auth")
  }

  const { referralCode, referralLink, referrals, rewardTotals } = data

  const totalInvites = referrals.length
  const signedUpCount = referrals.filter((referral) => referral.status === "signed_up" || referral.status === "qualified" || referral.status === "rewarded").length
  const qualifiedCount = referrals.filter((referral) => referral.status === "qualified" || referral.status === "rewarded").length

  return (
    <div className="mt-10 px-2 lg:p-8">
      <div className="mx-auto flex w-full flex-col space-y-6 lg:max-w-5xl">
        <div className="flex flex-col space-y-2 text-left">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Referral Rewards</h1>
          <p className="text-base text-muted-foreground">
            Share your invite link with future roommates to unlock rent credits and bonuses when they join Roomsily.
          </p>
        </div>
        <Separator />
        <Card>
          <CardHeader className="gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl">Share your invite</CardTitle>
              <p className="text-sm text-muted-foreground">
                Send your personalized link to track signups and rewards in real time.
              </p>
            </div>
            {referralCode ? (
              <div className="flex flex-col items-start text-sm font-medium lg:items-end">
                <span className="text-muted-foreground">Referral code</span>
                <span className="font-mono text-lg">{referralCode}</span>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-6">
            {referralLink ? (
              <ShareLinkInput referralLink={referralLink} />
            ) : (
              <div className="rounded-md border border-dashed border-muted-foreground/50 p-4 text-sm text-muted-foreground">
                We couldn&apos;t generate a link right now. Refresh to try again.
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-3 rounded-md border p-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Users className="size-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invites sent</p>
                  <p className="text-xl font-semibold">{totalInvites}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-md border p-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Link2 className="size-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Signups credited</p>
                  <p className="text-xl font-semibold">{signedUpCount}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-md border p-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  <Gift className="size-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Qualified rewards</p>
                  <p className="text-xl font-semibold">{qualifiedCount}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric
                label="Pending"
                amount={rewardTotals.pending}
                currency={rewardTotals.currency}
              />
              <Metric
                label="Earned"
                amount={rewardTotals.earned}
                currency={rewardTotals.currency}
              />
              <Metric
                label="Paid out"
                amount={rewardTotals.paid}
                currency={rewardTotals.currency}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Referral activity</CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="rounded-md border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
                No referrals yet. Share your link to see progress here.
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <table className="min-w-full divide-y divide-muted-foreground/20 text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left font-medium">
                        Invitee
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-medium">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-medium">
                        Reward
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-medium">
                        Last update
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted-foreground/20">
                    {referrals.map((referral) => {
                      const statusMeta = STATUS_METADATA[referral.status] ?? STATUS_METADATA.invited
                      const lastTouch = referral.rewardedAt || referral.qualifiedAt || referral.signedUpAt || referral.createdAt
                      const rewardLabel = referral.reward
                        ? `${formatCurrency(referral.reward.amount, referral.reward.currency)} • ${referral.reward.status
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (char) => char.toUpperCase())}`
                        : "—"

                      return (
                        <tr key={referral.id} className="bg-background/50">
                          <td className="px-4 py-3 font-medium text-foreground">
                            {referral.referredEmail}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                              <span className="text-xs text-muted-foreground">{statusMeta.description}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{rewardLabel}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDateTime(lastTouch)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Metric({ label, amount, currency }: { label: string; amount: number; currency: string }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{formatCurrency(amount, currency)}</p>
    </div>
  )
}
