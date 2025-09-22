import { revalidatePath } from "next/cache"
import { redirect, notFound } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/server"

const ADMIN_ROLES = new Set(["admin", "owner", "manager", "property_manager"])
const DEFAULT_INVITE_EXPIRATION_DAYS = 7

interface ProfileSummary {
  id: string
  full_name: string | null
  email: string | null
}

interface HouseholdMemberSummary {
  membershipId: string | null
  profileId: string | null
  role: string | null
  status: string | null
  joinedAt: string | null
  profile?: ProfileSummary
}

interface HouseholdInviteSummary {
  id: string
  token: string
  created_at: string | null
  expires_at: string | null
  revoked_at: string | null
  redeemed_at?: string | null
  email?: string | null
  created_by?: string | null
  redeemed_by?: string | null
}

type ActionResult = {
  success: boolean
  error?: string
}

async function ensureAdmin(
  supabase: ReturnType<typeof createClient>,
  householdId: string,
  userId: string
): Promise<ActionResult> {
  const { data: memberships, error } = await supabase
    .from("member_households")
    .select("*")
    .eq("household_id", householdId)

  if (error) {
    console.error("Failed to load household memberships", error)
    return { success: false, error: "Unable to verify permissions." }
  }

  const currentMembership = (memberships ?? []).find((membership: any) => {
    const memberId = extractProfileId(membership)
    return memberId === userId
  })

  if (!currentMembership) {
    return { success: false, error: "You are not a member of this household." }
  }

  const role = String(currentMembership.role ?? "").toLowerCase()
  if (!ADMIN_ROLES.has(role)) {
    return { success: false, error: "You do not have admin access for this household." }
  }

  return { success: true }
}

function extractProfileId(row: any): string | null {
  return (
    row?.profile_id ??
    row?.user_id ??
    row?.member_id ??
    row?.member_profile_id ??
    row?.profileId ??
    null
  )
}

function buildInviteUrl(token: string) {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  const baseUrl = configuredBaseUrl ?? "http://localhost:3000"

  return `${baseUrl.replace(/\/$/, "")}/invite/${token}`
}

function resolveInviteStatus(invite: HouseholdInviteSummary) {
  const now = new Date()

  if (invite.revoked_at) {
    return { label: "Revoked", variant: "destructive" as const }
  }

  if (invite.redeemed_at) {
    return { label: "Redeemed", variant: "secondary" as const }
  }

  if (invite.expires_at && new Date(invite.expires_at) < now) {
    return { label: "Expired", variant: "outline" as const }
  }

  return { label: "Active", variant: "complete" as const }
}

async function updateHouseholdName(
  householdId: string,
  formData: FormData
): Promise<ActionResult> {
  "use server"

  const rawName = formData.get("name")
  const name = typeof rawName === "string" ? rawName.trim() : ""

  if (!name) {
    return { success: false, error: "Household name is required." }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "You must be signed in to make changes." }
  }

  const permissionResult = await ensureAdmin(supabase, householdId, user.id)
  if (!permissionResult.success) {
    return permissionResult
  }

  const { error } = await supabase
    .from("households")
    .update({
      name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", householdId)

  if (error) {
    console.error("Failed to update household name", error)
    return { success: false, error: "Failed to update household name." }
  }

  revalidatePath(`/households/${householdId}/settings`)

  return { success: true }
}

async function updateMemberRole(
  householdId: string,
  membershipId: string | null,
  memberId: string | null,
  formData: FormData
): Promise<ActionResult> {
  "use server"

  const rawRole = formData.get("role")
  const role = typeof rawRole === "string" ? rawRole.trim() : ""

  if (!role) {
    return { success: false, error: "Role is required." }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "You must be signed in to make changes." }
  }

  const permissionResult = await ensureAdmin(supabase, householdId, user.id)
  if (!permissionResult.success) {
    return permissionResult
  }

  let query = supabase
    .from("member_households")
    .update({ role })
    .eq("household_id", householdId)

  if (membershipId) {
    query = query.eq("id", membershipId)
  } else if (memberId) {
    query = query.eq("member_id", memberId)
  } else {
    return { success: false, error: "Unable to identify member." }
  }

  const { error } = await query

  if (error) {
    console.error("Failed to update member role", error)
    return { success: false, error: "Failed to update member role." }
  }

  revalidatePath(`/households/${householdId}/settings`)

  return { success: true }
}

async function generateInviteLink(
  householdId: string,
  formData: FormData
): Promise<ActionResult> {
  "use server"

  const expiresInDaysRaw = formData.get("expiresInDays")
  const expiresInDays = Number(expiresInDaysRaw ?? DEFAULT_INVITE_EXPIRATION_DAYS)
  const emailRaw = formData.get("email")
  const inviteeEmail = typeof emailRaw === "string" && emailRaw.trim().length ? emailRaw.trim() : null

  const duration = Number.isFinite(expiresInDays) && expiresInDays > 0 ? expiresInDays : DEFAULT_INVITE_EXPIRATION_DAYS
  const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "You must be signed in to create invites." }
  }

  const permissionResult = await ensureAdmin(supabase, householdId, user.id)
  if (!permissionResult.success) {
    return permissionResult
  }

  const token = crypto.randomUUID()

  const { error } = await supabase.from("household_invites").insert({
    household_id: householdId,
    token,
    expires_at: expiresAt,
    created_by: user.id,
    email: inviteeEmail,
  })

  if (error) {
    console.error("Failed to create invite", error)
    return { success: false, error: "Failed to generate invite link." }
  }

  revalidatePath(`/households/${householdId}/settings`)

  return { success: true }
}

async function revokeInvite(
  householdId: string,
  inviteId: string
): Promise<ActionResult> {
  "use server"

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "You must be signed in to revoke invites." }
  }

  const permissionResult = await ensureAdmin(supabase, householdId, user.id)
  if (!permissionResult.success) {
    return permissionResult
  }

  const { error } = await supabase
    .from("household_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("household_id", householdId)

  if (error) {
    console.error("Failed to revoke invite", error)
    return { success: false, error: "Failed to revoke invite." }
  }

  revalidatePath(`/households/${householdId}/settings`)

  return { success: true }
}

async function regenerateInvite(
  householdId: string,
  inviteId: string,
  formData: FormData
): Promise<ActionResult> {
  "use server"

  const expiresInDaysRaw = formData.get("expiresInDays")
  const expiresInDays = Number(expiresInDaysRaw ?? DEFAULT_INVITE_EXPIRATION_DAYS)
  const duration = Number.isFinite(expiresInDays) && expiresInDays > 0 ? expiresInDays : DEFAULT_INVITE_EXPIRATION_DAYS
  const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "You must be signed in to regenerate invites." }
  }

  const permissionResult = await ensureAdmin(supabase, householdId, user.id)
  if (!permissionResult.success) {
    return permissionResult
  }

  const token = crypto.randomUUID()

  const { error } = await supabase
    .from("household_invites")
    .update({
      token,
      revoked_at: null,
      redeemed_at: null,
      expires_at: expiresAt,
    })
    .eq("id", inviteId)
    .eq("household_id", householdId)

  if (error) {
    console.error("Failed to regenerate invite", error)
    return { success: false, error: "Failed to regenerate invite." }
  }

  revalidatePath(`/households/${householdId}/settings`)

  return { success: true }
}

export default async function HouseholdSettingsPage({
  params,
}: {
  params: { id: string }
}) {
  const householdId = params.id
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth?redirect=/households/${householdId}/settings`)
  }

  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("*")
    .eq("id", householdId)
    .maybeSingle()

  if (householdError || !household) {
    console.error("Failed to load household", householdError)
    notFound()
  }

  const { data: membershipRows, error: membershipsError } = await supabase
    .from("member_households")
    .select("*")
    .eq("household_id", householdId)

  if (membershipsError) {
    console.error("Failed to load members", membershipsError)
    notFound()
  }

  const currentMembership = (membershipRows ?? []).find((membership: any) => {
    const memberId = extractProfileId(membership)
    return memberId === user.id
  })

  if (!currentMembership || !ADMIN_ROLES.has(String(currentMembership.role ?? "").toLowerCase())) {
    notFound()
  }

  const uniqueProfileIds = Array.from(
    new Set(
      (membershipRows ?? [])
        .map((membership: any) => extractProfileId(membership))
        .filter((id): id is string => Boolean(id))
    )
  )

  const profileMap: Record<string, ProfileSummary> = {}

  if (uniqueProfileIds.length) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", uniqueProfileIds)

    if (profileError) {
      console.error("Failed to load member profiles", profileError)
    } else {
      for (const profile of profileRows ?? []) {
        profileMap[profile.id] = profile
      }
    }
  }

  const members: HouseholdMemberSummary[] = (membershipRows ?? [])
    .map((membership: any) => {
      const profileId = extractProfileId(membership)
      return {
        membershipId: membership?.id ?? null,
        profileId,
        role: membership?.role ?? null,
        status: membership?.status ?? null,
        joinedAt: membership?.created_at ?? null,
        profile: profileId ? profileMap[profileId] : undefined,
      }
    })
    .sort((a, b) => {
      const aRole = String(a.role ?? "").toLowerCase()
      const bRole = String(b.role ?? "").toLowerCase()
      if (aRole === bRole) {
        return (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? "")
      }
      if (ADMIN_ROLES.has(aRole) && !ADMIN_ROLES.has(bRole)) {
        return -1
      }
      if (!ADMIN_ROLES.has(aRole) && ADMIN_ROLES.has(bRole)) {
        return 1
      }
      return aRole.localeCompare(bRole)
    })

  const { data: inviteRows, error: invitesError } = await supabase
    .from("household_invites")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })

  if (invitesError) {
    console.error("Failed to load invites", invitesError)
  }

  const inviteProfileIds = Array.from(
    new Set(
      (inviteRows ?? [])
        .flatMap((invite: any) => [invite?.created_by, invite?.redeemed_by].filter(Boolean))
        .filter((id): id is string => Boolean(id) && !profileMap[id as string])
    )
  )

  if (inviteProfileIds.length) {
    const { data: inviteProfiles, error: inviteProfileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", inviteProfileIds)

    if (inviteProfileError) {
      console.error("Failed to load invite profile metadata", inviteProfileError)
    } else {
      for (const profile of inviteProfiles ?? []) {
        profileMap[profile.id] = profile
      }
    }
  }

  const invites: HouseholdInviteSummary[] = (inviteRows ?? []).map((invite: any) => ({
    id: invite.id,
    token: invite.token,
    created_at: invite.created_at ?? null,
    expires_at: invite.expires_at ?? null,
    revoked_at: invite.revoked_at ?? null,
    redeemed_at: invite.redeemed_at ?? null,
    email: invite.email ?? null,
    created_by: invite.created_by ?? null,
    redeemed_by: invite.redeemed_by ?? null,
  }))

  const updateNameAction = updateHouseholdName.bind(null, householdId)
  const generateInviteAction = generateInviteLink.bind(null, householdId)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Household details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateNameAction} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="household-name">Household name</Label>
              <Input
                id="household-name"
                name="name"
                defaultValue={household.name ?? ""}
                placeholder="Enter household name"
                required
              />
            </div>
            <Button type="submit">Save changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite roommates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form action={generateInviteAction} className="grid gap-4 md:grid-cols-3 md:items-end">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="invite-email">Invitee email (optional)</Label>
              <Input id="invite-email" name="email" type="email" placeholder="roommate@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expires-in">Expires in (days)</Label>
              <Input
                id="expires-in"
                name="expiresInDays"
                type="number"
                min={1}
                max={90}
                defaultValue={DEFAULT_INVITE_EXPIRATION_DAYS}
              />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Generate invite link</Button>
            </div>
          </form>

          <div className="space-y-3">
            <h3 className="text-sm font-medium uppercase text-muted-foreground">Invite history</h3>
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invite links have been created yet.</p>
            ) : (
              <ul className="space-y-3">
                {invites.map(invite => {
                  const status = resolveInviteStatus(invite)
                  const inviteUrl = buildInviteUrl(invite.token)
                  const revokeAction = revokeInvite.bind(null, householdId, invite.id)
                  const regenerateAction = regenerateInvite.bind(null, householdId, invite.id)
                  const creator = invite.created_by ? profileMap[invite.created_by] : undefined
                  const redeemedBy = invite.redeemed_by ? profileMap[invite.redeemed_by] : undefined

                  const createdAtLabel = invite.created_at
                    ? `Created ${formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}`
                    : "Created date unavailable"

                  const expiresLabel = invite.expires_at
                    ? `Expires ${formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}`
                    : "No expiration"

                  return (
                    <li
                      key={invite.id}
                      className="rounded-lg border bg-card p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="break-all font-medium">{inviteUrl}</span>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div>{createdAtLabel}</div>
                            <div>{expiresLabel}</div>
                            {invite.email && <div>Invited email: {invite.email}</div>}
                            {creator && (
                              <div>
                                Created by {creator.full_name ?? creator.email ?? "Unknown"}
                              </div>
                            )}
                            {redeemedBy && (
                              <div>
                                Redeemed by {redeemedBy.full_name ?? redeemedBy.email ?? "Unknown"}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-2 md:items-end">
                          <form action={revokeAction}>
                            <Button
                              type="submit"
                              variant="outline"
                              size="sm"
                              disabled={status.label !== "Active"}
                            >
                              Revoke
                            </Button>
                          </form>
                          <form action={regenerateAction} className="flex items-center gap-2">
                            <Input
                              className="h-9 w-24"
                              type="number"
                              name="expiresInDays"
                              min={1}
                              max={90}
                              defaultValue={DEFAULT_INVITE_EXPIRATION_DAYS}
                            />
                            <Button type="submit" variant="ghost" size="sm">
                              Regenerate
                            </Button>
                          </form>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Member roles</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No household members found.</p>
          ) : (
            <ul className="space-y-3">
              {members.map((member, index) => {
                const updateRoleAction = updateMemberRole.bind(
                  null,
                  householdId,
                  member.membershipId,
                  member.profileId
                )

                const roleValue = String(member.role ?? "member").toLowerCase()

                return (
                  <li
                    key={member.membershipId ?? member.profileId ?? `member-${index}`}
                    className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        {member.profile?.full_name ?? member.profile?.email ?? "Unknown member"}
                      </p>
                      {member.profile?.email && (
                        <p className="text-sm text-muted-foreground">{member.profile.email}</p>
                      )}
                      {member.joinedAt && (
                        <p className="text-xs text-muted-foreground">
                          Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <form action={updateRoleAction} className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground md:hidden">
                        Role
                      </Label>
                      <select
                        name="role"
                        defaultValue={roleValue}
                        className={cn(
                          "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        )}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <Button type="submit" variant="outline" size="sm">
                        Update
                      </Button>
                    </form>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
