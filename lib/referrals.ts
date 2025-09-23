import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/supabase"

export type ReferralInvitation = Tables<"referral_invitations">
export type ReferralRewardEntry = Tables<"referral_reward_ledger">
export type ReferralInvitationInsert = TablesInsert<"referral_invitations">
export type ReferralInvitationUpdate = TablesUpdate<"referral_invitations">
export type ReferralRewardInsert = TablesInsert<"referral_reward_ledger">

const MS_PER_DAY = 24 * 60 * 60 * 1000

function defaultTokenGenerator() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeBaseUrl(explicitBaseUrl?: string | null) {
  const envUrl =
    explicitBaseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL

  if (!envUrl) {
    return "http://localhost:3000"
  }

  if (envUrl.startsWith("http")) {
    return envUrl
  }

  return `https://${envUrl}`
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export interface ReferralRepository {
  createInvitation(values: ReferralInvitationInsert): Promise<ReferralInvitation>
  findInvitationByToken(token: string): Promise<ReferralInvitation | null>
  updateInvitation(
    id: string,
    updates: ReferralInvitationUpdate
  ): Promise<ReferralInvitation>
  createRewardEntry(values: ReferralRewardInsert): Promise<ReferralRewardEntry>
}

export class SupabaseReferralRepository implements ReferralRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async createInvitation(values: ReferralInvitationInsert) {
    const { data, error } = await this.supabase
      .from("referral_invitations")
      .insert(values)
      .select("*")
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create referral invitation")
    }

    return data
  }

  async findInvitationByToken(token: string) {
    const { data, error } = await this.supabase
      .from("referral_invitations")
      .select("*")
      .eq("invite_token", token)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return data ?? null
  }

  async updateInvitation(id: string, updates: ReferralInvitationUpdate) {
    const { data, error } = await this.supabase
      .from("referral_invitations")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update referral invitation")
    }

    return data
  }

  async createRewardEntry(values: ReferralRewardInsert) {
    const { data, error } = await this.supabase
      .from("referral_reward_ledger")
      .insert(values)
      .select("*")
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create referral reward entry")
    }

    return data
  }
}

export interface CreateReferralInvitationOptions {
  repository: ReferralRepository
  inviterId: string
  inviteeEmail: string
  inviteeName?: string | null
  householdId?: string | null
  baseUrl?: string
  expiresInDays?: number
  metadata?: Record<string, unknown>
  now?: Date
  generateToken?: () => string
}

export async function createReferralInvitationFlow({
  repository,
  inviterId,
  inviteeEmail,
  inviteeName,
  householdId,
  baseUrl,
  expiresInDays = 14,
  metadata,
  now = new Date(),
  generateToken = defaultTokenGenerator,
}: CreateReferralInvitationOptions) {
  const normalizedEmail = normalizeEmail(inviteeEmail)
  const token = generateToken()
  const invitationExpiresAt =
    typeof expiresInDays === "number" && Number.isFinite(expiresInDays)
      ? new Date(now.getTime() + expiresInDays * MS_PER_DAY)
      : null

  const invitation = await repository.createInvitation({
    inviter_id: inviterId,
    invitee_email: normalizedEmail,
    invitee_name: inviteeName ?? null,
    invite_token: token,
    status: "pending",
    sent_at: now.toISOString(),
    expires_at: invitationExpiresAt ? invitationExpiresAt.toISOString() : null,
    household_id: householdId ?? null,
    metadata: metadata ?? null,
  })

  return {
    invitation,
    inviteLink: `${normalizeBaseUrl(baseUrl)}/referrals/accept?token=${token}`,
  }
}

export interface MapSignupToReferrerOptions {
  repository: ReferralRepository
  inviteToken: string
  inviteeId: string
  inviteeEmail?: string | null
  rewardAmount?: number
  currency?: string
  rewardType?: string
  description?: string
  now?: Date
}

export async function mapSignupToReferrer({
  repository,
  inviteToken,
  inviteeId,
  inviteeEmail,
  rewardAmount = 50,
  currency = "USD",
  rewardType = "referral_bonus",
  description,
  now = new Date(),
}: MapSignupToReferrerOptions) {
  const invitation = await repository.findInvitationByToken(inviteToken)

  if (!invitation) {
    throw new Error("Invitation not found")
  }

  if (invitation.status !== "pending") {
    throw new Error(`Invitation is not pending (current status: ${invitation.status})`)
  }

  if (invitation.expires_at) {
    const expiresAt = new Date(invitation.expires_at)
    if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < now.getTime()) {
      await repository.updateInvitation(invitation.id, {
        status: "expired",
      })
      throw new Error("Invitation has expired")
    }
  }

  const updatedInvitation = await repository.updateInvitation(invitation.id, {
    status: "accepted",
    accepted_at: now.toISOString(),
    accepted_by: inviteeId,
    invitee_email: inviteeEmail ? normalizeEmail(inviteeEmail) : invitation.invitee_email,
  })

  let reward: ReferralRewardEntry | null = null

  if (rewardAmount > 0) {
    reward = await repository.createRewardEntry({
      invitation_id: invitation.id,
      inviter_id: invitation.inviter_id,
      invitee_id: inviteeId,
      household_id: invitation.household_id ?? null,
      amount: rewardAmount,
      currency,
      reward_type: rewardType,
      status: "earned",
      description:
        description ??
        `Referral bonus for inviting ${inviteeEmail ?? invitation.invitee_email}`,
      posted_at: now.toISOString(),
    })
  }

  return { invitation: updatedInvitation, reward }
}

export interface PostReferralRewardOptions {
  repository: ReferralRepository
  invitationId: string | null
  inviterId: string
  inviteeId?: string | null
  householdId?: string | null
  amount: number
  currency?: string
  rewardType?: string
  status?: ReferralRewardEntry["status"]
  description?: string
  metadata?: Record<string, unknown>
  now?: Date
}

export async function postReferralReward({
  repository,
  invitationId,
  inviterId,
  inviteeId = null,
  householdId = null,
  amount,
  currency = "USD",
  rewardType = "referral_bonus",
  status = "earned",
  description,
  metadata,
  now = new Date(),
}: PostReferralRewardOptions) {
  if (amount === 0) {
    throw new Error("Reward amount must be non-zero")
  }

  const reward = await repository.createRewardEntry({
    invitation_id: invitationId,
    inviter_id: inviterId,
    invitee_id: inviteeId,
    household_id: householdId,
    amount,
    currency,
    reward_type: rewardType,
    status,
    description: description ?? "Referral reward posted",
    metadata: metadata ?? null,
    posted_at: now.toISOString(),
  })

  return reward
}

export { normalizeBaseUrl as resolveReferralBaseUrl }
