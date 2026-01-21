import { describe, expect, it } from "vitest"

import {
  createReferralInvitationFlow,
  mapSignupToReferrer,
  postReferralReward,
  type ReferralInvitation,
  type ReferralInvitationInsert,
  type ReferralInvitationUpdate,
  type ReferralRepository,
  type ReferralRewardEntry,
  type ReferralRewardInsert,
} from "@/lib/referrals"

class InMemoryReferralRepository implements ReferralRepository {
  private invitationStore = new Map<string, ReferralInvitation>()
  private rewardStore = new Map<string, ReferralRewardEntry>()
  private invitationIndexByToken = new Map<string, string>()
  private invitationSequence = 0
  private rewardSequence = 0

  async createInvitation(values: ReferralInvitationInsert) {
    const nowIso = new Date().toISOString()
    const id = values.id ?? `inv_${++this.invitationSequence}`

    const record: ReferralInvitation = {
      id,
      inviter_id: values.inviter_id ?? "",
      invitee_email: values.invitee_email ?? "",
      invitee_name: values.invitee_name ?? null,
      invite_token: values.invite_token ?? "",
      status: (values.status as ReferralInvitation["status"]) ?? "pending",
      sent_at: values.sent_at ?? nowIso,
      accepted_at: values.accepted_at ?? null,
      expires_at: values.expires_at ?? null,
      accepted_by: values.accepted_by ?? null,
      household_id: values.household_id ?? null,
      metadata: (values.metadata as ReferralInvitation["metadata"]) ?? null,
      created_at: values.created_at ?? nowIso,
      updated_at: values.updated_at ?? nowIso,
    }

    this.invitationStore.set(record.id, record)
    this.invitationIndexByToken.set(record.invite_token, record.id)

    return record
  }

  async findInvitationByToken(token: string) {
    const id = this.invitationIndexByToken.get(token)
    if (!id) {
      return null
    }
    return this.invitationStore.get(id) ?? null
  }

  async updateInvitation(id: string, updates: ReferralInvitationUpdate) {
    const existing = this.invitationStore.get(id)
    if (!existing) {
      throw new Error("Invitation not found")
    }

    const updated: ReferralInvitation = {
      ...existing,
      ...updates,
      metadata: (updates.metadata as ReferralInvitation["metadata"]) ?? existing.metadata,
      updated_at: updates.updated_at ?? new Date().toISOString(),
    }

    this.invitationStore.set(id, updated)
    this.invitationIndexByToken.set(updated.invite_token, id)

    return updated
  }

  async createRewardEntry(values: ReferralRewardInsert) {
    const nowIso = new Date().toISOString()
    const id = values.id ?? `rew_${++this.rewardSequence}`

    const record: ReferralRewardEntry = {
      id,
      invitation_id: values.invitation_id ?? null,
      inviter_id: values.inviter_id ?? "",
      invitee_id: values.invitee_id ?? null,
      household_id: values.household_id ?? null,
      reward_type: values.reward_type ?? "referral_bonus",
      amount: typeof values.amount === "number" ? values.amount : Number(values.amount ?? 0),
      currency: values.currency ?? "USD",
      status: (values.status as ReferralRewardEntry["status"]) ?? "pending",
      description: values.description ?? null,
      posted_at: values.posted_at ?? nowIso,
      metadata: (values.metadata as ReferralRewardEntry["metadata"]) ?? null,
      created_at: values.created_at ?? nowIso,
      updated_at: values.updated_at ?? nowIso,
    }

    this.rewardStore.set(record.id, record)

    return record
  }

  get invitations() {
    return this.invitationStore
  }

  get rewards() {
    return this.rewardStore
  }
}

describe("referral flows", () => {
  it("creates a referral invitation with a shareable link", async () => {
    const repository = new InMemoryReferralRepository()
    const now = new Date("2025-03-10T12:00:00.000Z")

    const { invitation, inviteLink } = await createReferralInvitationFlow({
      repository,
      inviterId: "user_referrer",
      inviteeEmail: "FutureRoomie@example.com",
      householdId: "household-1",
      baseUrl: "https://roomsily.test",
      now,
      generateToken: () => "token-xyz",
    })

    expect(invitation.invite_token).toBe("token-xyz")
    expect(invitation.invitee_email).toBe("futureroomie@example.com")
    expect(invitation.status).toBe("pending")
    expect(invitation.expires_at).toBe("2025-03-24T12:00:00.000Z")
    expect(inviteLink).toBe("https://roomsily.test/referrals/accept?token=token-xyz")
    expect(repository.invitations.size).toBe(1)
  })

  it("maps a signup to the correct referrer and posts a reward", async () => {
    const repository = new InMemoryReferralRepository()
    const now = new Date("2025-04-01T00:00:00.000Z")

    const { invitation } = await createReferralInvitationFlow({
      repository,
      inviterId: "user_referrer",
      inviteeEmail: "new-roommate@example.com",
      baseUrl: "https://roomsily.test",
      now,
      generateToken: () => "token-map",
    })

    const result = await mapSignupToReferrer({
      repository,
      inviteToken: "token-map",
      inviteeId: "user_new",
      inviteeEmail: "new-roommate@example.com",
      rewardAmount: 75,
      currency: "USD",
      now: new Date("2025-04-03T10:30:00.000Z"),
    })

    expect(result.invitation.status).toBe("accepted")
    expect(result.invitation.accepted_by).toBe("user_new")
    expect(result.reward).not.toBeNull()
    expect(result.reward?.amount).toBe(75)
    expect(result.reward?.invitation_id).toBe(invitation.id)
    expect(repository.rewards.size).toBe(1)
  })

  it("marks invitations as expired when the token is stale", async () => {
    const repository = new InMemoryReferralRepository()

    await createReferralInvitationFlow({
      repository,
      inviterId: "user_referrer",
      inviteeEmail: "late@example.com",
      baseUrl: "https://roomsily.test",
      now: new Date("2024-12-01T00:00:00.000Z"),
      generateToken: () => "token-expired",
      expiresInDays: 7,
    })

    await expect(
      mapSignupToReferrer({
        repository,
        inviteToken: "token-expired",
        inviteeId: "late_user",
        now: new Date("2025-02-01T00:00:00.000Z"),
      })
    ).rejects.toThrow("Invitation has expired")

    const invitation = repository.invitations.values().next().value
    expect(invitation.status).toBe("expired")
  })

  it("allows manually posting rewards to the ledger", async () => {
    const repository = new InMemoryReferralRepository()

    const { invitation } = await createReferralInvitationFlow({
      repository,
      inviterId: "user_referrer",
      inviteeEmail: "ledger@example.com",
      baseUrl: "https://roomsily.test",
      now: new Date("2025-01-01T00:00:00.000Z"),
      generateToken: () => "token-ledger",
    })

    const reward = await postReferralReward({
      repository,
      invitationId: invitation.id,
      inviterId: invitation.inviter_id,
      inviteeId: "ledger_user",
      amount: 120,
      currency: "USD",
      rewardType: "referral_bonus",
      status: "paid",
      description: "Referral payout processed",
      now: new Date("2025-01-15T12:00:00.000Z"),
    })

    expect(reward.status).toBe("paid")
    expect(reward.amount).toBe(120)
    expect(repository.rewards.size).toBe(1)
  })
})
