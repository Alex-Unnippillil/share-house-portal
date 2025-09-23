import { describe, expect, it } from "vitest"

import {
  REFEREE_REWARD_AMOUNT,
  REFERRER_REWARD_AMOUNT,
  buildRewardSeed,
  buildRewardStatusUpdates,
  deriveRewardStatusFromReferralStatus,
  normalizeReferralCode,
} from "@/lib/referrals"

describe("referral reward helpers", () => {
  it("normalizes referral codes for lookup", () => {
    expect(normalizeReferralCode(" abc-123 ")).toBe("ABC123")
    expect(normalizeReferralCode("\t\n")).toBeUndefined()
    expect(normalizeReferralCode(undefined)).toBeUndefined()
  })

  it("creates reward seed entries when referrals are recorded", () => {
    const rewards = buildRewardSeed({
      id: "referral_1",
      status: "signed_up",
      referrer_id: "user_referrer",
      referred_user_id: "user_new",
    })

    expect(rewards).toHaveLength(2)
    const referrerReward = rewards.find((reward) => reward.reward_type === "referrer")
    const refereeReward = rewards.find((reward) => reward.reward_type === "referee")

    expect(referrerReward?.amount).toBe(REFERRER_REWARD_AMOUNT)
    expect(referrerReward?.status).toBe("earned")
    expect(refereeReward?.amount).toBe(REFEREE_REWARD_AMOUNT)
    expect(refereeReward?.status).toBe("pending")
  })

  it("propagates status changes to associated rewards", () => {
    const updates = buildRewardStatusUpdates(
      "rewarded",
      [
        {
          id: "reward_referrer",
          reward_type: "referrer",
          status: "earned",
          issued_at: "2024-02-01T00:00:00Z",
          paid_at: null,
        },
        {
          id: "reward_referee",
          reward_type: "referee",
          status: "pending",
          issued_at: null,
          paid_at: null,
        },
      ],
      "2024-03-01T00:00:00Z",
    )

    expect(updates).toHaveLength(2)
    expect(updates.find((update) => update.id === "reward_referrer")?.status).toBe("paid")
    expect(updates.find((update) => update.id === "reward_referee")?.status).toBe("paid")
  })

  it("derives reward status mapping for each referral milestone", () => {
    expect(deriveRewardStatusFromReferralStatus("invited", "referrer")).toBe("pending")
    expect(deriveRewardStatusFromReferralStatus("signed_up", "referrer")).toBe("earned")
    expect(deriveRewardStatusFromReferralStatus("qualified", "referee")).toBe("earned")
    expect(deriveRewardStatusFromReferralStatus("rewarded", "referee")).toBe("paid")
    expect(deriveRewardStatusFromReferralStatus("cancelled", "referee")).toBe("cancelled")
  })
})
