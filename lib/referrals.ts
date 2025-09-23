import { randomBytes } from 'node:crypto'

import type { Database, TablesInsert, TablesUpdate } from './supabase'

type ReferralRow = Database['public']['Tables']['referrals']['Row']
type RewardRow = Database['public']['Tables']['rewards']['Row']

export type ReferralStatus = ReferralRow['status']
export type RewardStatus = RewardRow['status']
export type RewardType = RewardRow['reward_type']

export const REFERRER_REWARD_AMOUNT = 50
export const REFEREE_REWARD_AMOUNT = 25
export const REFERRAL_REWARD_CURRENCY = 'USD'

const REWARD_STATUS_MATRIX: Record<ReferralStatus, Record<RewardType, RewardStatus>> = {
  invited: { referrer: 'pending', referee: 'pending' },
  signed_up: { referrer: 'earned', referee: 'pending' },
  qualified: { referrer: 'earned', referee: 'earned' },
  rewarded: { referrer: 'paid', referee: 'paid' },
  cancelled: { referrer: 'cancelled', referee: 'cancelled' },
}

export interface RewardSummary {
  pending: number
  earned: number
  paid: number
  cancelled: number
  currency: string
}

export function normalizeReferralCode(code?: string | null): string | undefined {
  if (!code) {
    return undefined
  }

  const trimmed = code.trim()
  if (!trimmed) {
    return undefined
  }

  return trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

export function deriveRewardStatusFromReferralStatus(
  status: ReferralStatus,
  rewardType: RewardType,
): RewardStatus {
  return REWARD_STATUS_MATRIX[status][rewardType]
}

export function summarizeRewards(
  rewards: Array<Pick<RewardRow, 'status' | 'amount' | 'currency'>>,
): RewardSummary {
  return rewards.reduce<RewardSummary>(
    (acc, reward) => {
      const amount = typeof reward.amount === 'string' ? Number(reward.amount) : reward.amount || 0
      const currency = reward.currency || REFERRAL_REWARD_CURRENCY

      switch (reward.status) {
        case 'pending':
          acc.pending += amount
          break
        case 'earned':
          acc.earned += amount
          break
        case 'paid':
          acc.paid += amount
          break
        case 'cancelled':
          acc.cancelled += amount
          break
      }

      acc.currency = currency
      return acc
    },
    { pending: 0, earned: 0, paid: 0, cancelled: 0, currency: REFERRAL_REWARD_CURRENCY },
  )
}

export function buildRewardSeed(
  referral: Pick<ReferralRow, 'id' | 'status' | 'referrer_id' | 'referred_user_id'>,
  now: string = new Date().toISOString(),
): TablesInsert<'rewards'>[] {
  const statuses = REWARD_STATUS_MATRIX[referral.status]
  const rows: TablesInsert<'rewards'>[] = [
    {
      referral_id: referral.id,
      user_id: referral.referrer_id,
      reward_type: 'referrer',
      amount: REFERRER_REWARD_AMOUNT,
      currency: REFERRAL_REWARD_CURRENCY,
      status: statuses.referrer,
      issued_at: ['earned', 'paid'].includes(statuses.referrer) ? now : null,
      paid_at: statuses.referrer === 'paid' ? now : null,
    },
  ]

  if (referral.referred_user_id) {
    rows.push({
      referral_id: referral.id,
      user_id: referral.referred_user_id,
      reward_type: 'referee',
      amount: REFEREE_REWARD_AMOUNT,
      currency: REFERRAL_REWARD_CURRENCY,
      status: statuses.referee,
      issued_at: ['earned', 'paid'].includes(statuses.referee) ? now : null,
      paid_at: statuses.referee === 'paid' ? now : null,
    })
  }

  return rows
}

export function buildRewardStatusUpdates(
  referralStatus: ReferralStatus,
  rewards: Array<Pick<RewardRow, 'id' | 'reward_type' | 'status' | 'issued_at' | 'paid_at'>>,
  now: string = new Date().toISOString(),
): TablesUpdate<'rewards'>[] {
  const statuses = REWARD_STATUS_MATRIX[referralStatus]

  return rewards
    .map((reward) => {
      const targetStatus = statuses[reward.reward_type]

      if (reward.status === targetStatus) {
        return null
      }

      return {
        id: reward.id,
        status: targetStatus,
        issued_at:
          ['earned', 'paid'].includes(targetStatus) && !reward.issued_at ? now : reward.issued_at ?? null,
        paid_at: targetStatus === 'paid' && !reward.paid_at ? now : reward.paid_at ?? null,
      }
    })
    .filter((update): update is TablesUpdate<'rewards'> => Boolean(update))
}

export function generateReferralCode(): string {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomBytes(9)
      .toString('base64url')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()

    if (candidate.length >= 8) {
      return candidate.slice(0, 10)
    }
  }

  return randomBytes(6).toString('hex').slice(0, 10).toUpperCase()
}
