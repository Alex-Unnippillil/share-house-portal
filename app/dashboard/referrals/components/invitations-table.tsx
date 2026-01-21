import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import type { ReferralInvitation } from "@/lib/referrals"

import { CopyButton } from "./copy-button"

type InvitationWithLink = ReferralInvitation & { inviteLink: string }

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function formatDate(value: string | null) {
  if (!value) {
    return "—"
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return "—"
  }

  return dateFormatter.format(parsed)
}

function getStatusVariant(status: ReferralInvitation["status"]) {
  switch (status) {
    case "accepted":
      return "complete" as const
    case "expired":
      return "destructive" as const
    case "revoked":
      return "outline" as const
    default:
      return "secondary" as const
  }
}

const statusLabel: Record<ReferralInvitation["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  expired: "Expired",
  revoked: "Revoked",
}

export function InvitationsTable({ invitations }: { invitations: InvitationWithLink[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite activity</CardTitle>
        <CardDescription>Monitor every invite and copy the shareable link when needed.</CardDescription>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t sent any invites yet. Send one above to generate your first referral link.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b">
                <tr className="text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Invitee</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Sent</th>
                  <th className="py-3 pr-4 font-medium">Accepted</th>
                  <th className="py-3 font-medium">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{invitation.invitee_email}</div>
                      {invitation.invitee_name ? (
                        <div className="text-xs text-muted-foreground">
                          {invitation.invitee_name}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={getStatusVariant(invitation.status)}>
                        {statusLabel[invitation.status]}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(invitation.sent_at ?? invitation.created_at)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(invitation.accepted_at)}
                    </td>
                    <td className="py-3">
                      <CopyButton value={invitation.inviteLink} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
