"use server"

import "server-only"

import { cookies } from "next/headers"

import type { User } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"
import {
  REFERRAL_REWARD_CURRENCY,
  buildRewardSeed,
  generateReferralCode,
  summarizeRewards,
  type RewardSummary,
} from "@/lib/referrals"
import { createClient } from "@/utils/supa-server-actions"

interface ReferralDashboardReferral {
  id: string
  referredEmail: string
  status: Database["public"]["Tables"]["referrals"]["Row"]["status"]
  createdAt: string | null
  signedUpAt: string | null
  qualifiedAt: string | null
  rewardedAt: string | null
  reward: {
    amount: number
    currency: string
    status: Database["public"]["Tables"]["rewards"]["Row"]["status"]
  } | null
}

export interface ReferralDashboardData {
  user: User | null
  referralCode: string | null
  referralLink: string | null
  usageCount: number
  referrals: ReferralDashboardReferral[]
  rewardTotals: RewardSummary
}

type ReferralCodeRow = Pick<Database["public"]["Tables"]["referral_codes"]["Row"], "id" | "code" | "usage_count">
type ReferralListRow = Pick<
  Database["public"]["Tables"]["referrals"]["Row"],
  | "id"
  | "referrer_id"
  | "referred_email"
  | "status"
  | "created_at"
  | "signed_up_at"
  | "qualified_at"
  | "rewarded_at"
  | "referred_user_id"
>
type RewardListRow = Pick<
  Database["public"]["Tables"]["rewards"]["Row"],
  "id" | "referral_id" | "reward_type" | "status" | "amount" | "currency" | "issued_at" | "paid_at"
>

type SupabaseClient = ReturnType<typeof createClient>

export async function loadReferralDashboardData(): Promise<ReferralDashboardData> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      referralCode: null,
      referralLink: null,
      usageCount: 0,
      referrals: [],
      rewardTotals: {
        pending: 0,
        earned: 0,
        paid: 0,
        cancelled: 0,
        currency: REFERRAL_REWARD_CURRENCY,
      },
    }
  }

  const activeCode = await ensureReferralCode(supabase, user.id)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
  const referralLink = activeCode ? `${appUrl}/onboarding?ref=${activeCode.code}` : null

  const { data: referralRows, error: referralError } = await supabase
    .from("referrals")
    .select(
      "id, referrer_id, referred_email, status, created_at, signed_up_at, qualified_at, rewarded_at, referred_user_id",
    )
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false, nullsFirst: false })
    .returns<ReferralListRow[]>()

  if (referralError) {
    console.error("Failed to load referral records", referralError)
  }

  const { data: rewardRows, error: rewardError } = await supabase
    .from("rewards")
    .select("id, referral_id, reward_type, status, amount, currency, issued_at, paid_at")
    .eq("user_id", user.id)
    .returns<RewardListRow[]>()

  if (rewardError) {
    console.error("Failed to load reward records", rewardError)
  }

  const rewardMap = new Map<string, RewardListRow>()
  rewardRows?.forEach((reward) => {
    if (reward.reward_type === "referrer") {
      rewardMap.set(reward.referral_id, reward)
    }
  })

  const referrals: ReferralDashboardReferral[] = (referralRows ?? []).map((referral) => {
    const reward = rewardMap.get(referral.id)

    const fallback = buildRewardSeed({
      id: referral.id,
      status: referral.status,
      referrer_id: referral.referrer_id,
      referred_user_id: referral.referred_user_id,
    })

    const referrerReward = reward
      ? {
          amount: typeof reward.amount === "string" ? Number(reward.amount) : reward.amount || 0,
          currency: reward.currency || REFERRAL_REWARD_CURRENCY,
          status: reward.status,
        }
      : fallback.length
        ? {
            amount:
              typeof fallback[0].amount === "string" ? Number(fallback[0].amount) : fallback[0].amount || 0,
            currency: fallback[0].currency || REFERRAL_REWARD_CURRENCY,
            status: fallback[0].status,
          }
        : null

    return {
      id: referral.id,
      referredEmail: referral.referred_email,
      status: referral.status,
      createdAt: referral.created_at,
      signedUpAt: referral.signed_up_at,
      qualifiedAt: referral.qualified_at,
      rewardedAt: referral.rewarded_at,
      reward: referrerReward,
    }
  })

  const rewardTotals = summarizeRewards(rewardRows ?? [])

  return {
    user,
    referralCode: activeCode?.code ?? null,
    referralLink,
    usageCount: activeCode?.usage_count ?? 0,
    referrals,
    rewardTotals,
  }
}

async function ensureReferralCode(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReferralCodeRow | null> {
  const { data: existingCodes, error: existingError } = await supabase
    .from("referral_codes")
    .select("id, code, usage_count")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .returns<ReferralCodeRow[]>()

  if (existingError) {
    console.error("Failed to fetch referral code", existingError)
  }

  if (existingCodes?.[0]) {
    return existingCodes[0]
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidateCode = generateReferralCode()

    const { data: newCodes, error } = await supabase
      .from("referral_codes")
      .insert({ user_id: userId, code: candidateCode })
      .select("id, code, usage_count")
      .returns<ReferralCodeRow[]>()

    if (error) {
      if (error.code === "23505") {
        continue
      }
      console.error("Failed to create referral code", error)
      break
    }

    if (newCodes?.[0]) {
      return newCodes[0]
    }
  }

  return null
}
