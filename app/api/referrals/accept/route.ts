import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import {
  SupabaseReferralRepository,
  mapSignupToReferrer,
} from "@/lib/referrals"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"
import { getServiceRoleSupabaseClient } from "@/utils/supabase-service-role"

const acceptRequestSchema = z.object({
  token: z.string().min(16, { message: "Invalid referral token" }),
})

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsed = acceptRequestSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Unable to accept invitation",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore) as SupabaseClient<Database>
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const serviceClient = getServiceRoleSupabaseClient()

  if (!serviceClient) {
    return NextResponse.json(
      { error: "Referral service is not available" },
      { status: 500 }
    )
  }

  const repository = new SupabaseReferralRepository(serviceClient)
  const { token } = parsed.data

  try {
    const rawRewardAmount = process.env.REFERRAL_REWARD_AMOUNT
    const rewardAmount =
      rawRewardAmount !== undefined && rawRewardAmount !== null
        ? Number.parseFloat(rawRewardAmount)
        : 50

    const { invitation, reward } = await mapSignupToReferrer({
      repository,
      inviteToken: token,
      inviteeId: user.id,
      inviteeEmail: user.email ?? undefined,
      rewardAmount: Number.isFinite(rewardAmount) ? rewardAmount : 50,
      currency: process.env.REFERRAL_REWARD_CURRENCY ?? "USD",
      description: `Referral reward for ${user.email ?? "new roommate"}`,
    })

    if (invitation.household_id) {
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("unit_id")
        .eq("id", user.id)
        .maybeSingle()

      if (!profile?.unit_id) {
        await serviceClient
          .from("profiles")
          .update({ unit_id: invitation.household_id })
          .eq("id", user.id)
      }
    }

    return NextResponse.json({ invitation, reward })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to accept referral invitation"

    const status = message.includes("not found") || message.includes("expired") ? 400 : 500

    console.error("Failed to accept referral invitation", error)

    return NextResponse.json({ error: message }, { status })
  }
}
