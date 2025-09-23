import * as React from "react"

type ReferralInviteEmailProps = {
  inviterName?: string | null
  inviteLink: string
  householdName?: string | null
  rewardAmount?: number
  currency?: string
}

export function ReferralInviteEmail({
  inviterName,
  inviteLink,
  householdName,
  rewardAmount,
  currency = "USD",
}: ReferralInviteEmailProps) {
  const formattedReward =
    typeof rewardAmount === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
        }).format(rewardAmount)
      : null

  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", lineHeight: 1.6 }}>
      <h2 style={{ color: "#111827" }}>You&apos;re invited to Roomsily!</h2>
      <p>
        {inviterName ? `${inviterName} has invited you` : "A roommate has invited you"} to
        join {householdName ? `${householdName} on Roomsily` : "the Roomsily household portal"}.
      </p>
      <p>
        Roomsily keeps rent, chores, documents, and amenity bookings tidy for every roommate. Use the
        secure button below to claim your spot and finish setting up your account.
      </p>
      {formattedReward ? (
        <p style={{ backgroundColor: "#F3F4F6", padding: "12px 16px", borderRadius: 8 }}>
          Join now and {inviterName ? `${inviterName} will earn` : "your roommate will earn"}{" "}
          <strong>{formattedReward}</strong> once you complete onboarding.
        </p>
      ) : null}
      <a
        href={inviteLink}
        style={{
          display: "inline-block",
          backgroundColor: "#111827",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: 9999,
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Accept invitation
      </a>
      <p style={{ fontSize: 12, color: "#6B7280", marginTop: 24 }}>
        If the button doesn&apos;t work, copy and paste this link into your browser:
        <br />
        <span style={{ wordBreak: "break-all" }}>{inviteLink}</span>
      </p>
    </div>
  )
}
