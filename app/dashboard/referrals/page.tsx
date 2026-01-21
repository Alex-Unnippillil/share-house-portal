import { redirect } from "next/navigation"

import {
  ReferralInvitation,
  ReferralRewardEntry,
  resolveReferralBaseUrl,
} from "@/lib/referrals"
import { createSupbaseServerClient } from "@/utils/supaone"

import { InviteEmailForm } from "./components/invite-email-form"
import { InvitationsTable } from "./components/invitations-table"
import { ReferralSummary } from "./components/referral-summary"
import { RewardsTable } from "./components/rewards-table"

type InvitationRow = ReferralInvitation & { inviteLink: string }

export default async function ReferralDashboardPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const [profileResult, invitationsResult, rewardsResult] = await Promise.all([
    supabase.from("profiles").select("full_name, unit_id").eq("id", user.id).maybeSingle(),
    supabase
      .from("referral_invitations")
      .select("*")
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("referral_reward_ledger")
      .select("*")
      .eq("inviter_id", user.id)
      .order("posted_at", { ascending: false }),
  ])

  if (profileResult.error) {
    console.error("Failed to load profile for referral dashboard", profileResult.error)
  }

  if (invitationsResult.error) {
    console.error("Failed to load referral invitations", invitationsResult.error)
  }

  if (rewardsResult.error) {
    console.error("Failed to load referral rewards", rewardsResult.error)
  }

  const profile = profileResult.data ?? null
  const invitationsData = invitationsResult.data ?? []
  const rewardsData = rewardsResult.data ?? []

  const baseUrl = resolveReferralBaseUrl()
  const invitations: InvitationRow[] = (invitationsData ?? []).map((invitation) => ({
    ...invitation,
    inviteLink: `${baseUrl}/referrals/accept?token=${invitation.invite_token}`,
  }))

  const rewards: ReferralRewardEntry[] = rewardsData ?? []
  const invitationLookup = new Map(invitations.map((inv) => [inv.id, inv]))

  const totalInvites = invitations.length
  const acceptedInvites = invitations.filter((inv) => inv.status === "accepted").length
  const pendingInvites = invitations.filter((inv) => inv.status === "pending").length

  const totalRewardsValue = rewards.reduce((sum, reward) => {
    const amount = typeof reward.amount === "number" ? reward.amount : Number(reward.amount ?? 0)
    const signedAmount = reward.status === "reversed" ? -Math.abs(amount) : amount
    return sum + signedAmount
  }, 0)

  const latestPendingInvite = invitations.find((inv) => inv.status === "pending")

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Referral dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Invite roommates, keep track of invite status, and monitor your earned rewards.
        </p>
      </div>

      <ReferralSummary
        totalInvites={totalInvites}
        acceptedInvites={acceptedInvites}
        pendingInvites={pendingInvites}
        totalRewards={totalRewardsValue}
        currency={process.env.REFERRAL_REWARD_CURRENCY ?? "USD"}
      />

      <InviteEmailForm
        inviterName={profile?.full_name ?? undefined}
        latestPendingInviteLink={latestPendingInvite?.inviteLink}
      />

      <InvitationsTable invitations={invitations} />

      <RewardsTable
        rewards={rewards}
        invitationLookup={invitationLookup}
        currency={process.env.REFERRAL_REWARD_CURRENCY ?? "USD"}
      />
    </div>
  )
}
