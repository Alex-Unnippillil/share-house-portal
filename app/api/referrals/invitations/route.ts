import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import { Resend } from "resend"

import { ReferralInviteEmail } from "@/components/emails/referral-invite"
import {
  SupabaseReferralRepository,
  createReferralInvitationFlow,
  resolveReferralBaseUrl,
} from "@/lib/referrals"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"

const inviteRequestSchema = z.object({
  email: z.string().email({ message: "Please provide a valid email address." }),
  name: z
    .string()
    .trim()
    .min(1, { message: "Name cannot be empty" })
    .max(120, { message: "Name is too long" })
    .optional(),
})

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsed = inviteRequestSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Unable to send invite",
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

  const { email, name } = parsed.data

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, unit_id")
      .eq("id", user.id)
      .maybeSingle()

    const repository = new SupabaseReferralRepository(supabase)
    const now = new Date()
    const baseUrl = resolveReferralBaseUrl()

    const { invitation, inviteLink } = await createReferralInvitationFlow({
      repository,
      inviterId: user.id,
      inviteeEmail: email,
      inviteeName: name,
      householdId: profile?.unit_id ?? null,
      baseUrl,
      now,
      metadata: {
        inviter_name: profile?.full_name ?? null,
        created_via: "email_invite",
      },
    })

    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 500 }
      )
    }

    const resend = new Resend(resendApiKey)
    const fromAddress =
      process.env.REFERRAL_EMAIL_FROM ?? "Roomsily Referrals <invitations@roomsily.com>"

    const rawRewardAmount = process.env.REFERRAL_REWARD_AMOUNT
    const rewardAmount =
      rawRewardAmount !== undefined && rawRewardAmount !== null
        ? Number.parseFloat(rawRewardAmount)
        : undefined

    await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject: `${profile?.full_name ?? "A roommate"} invited you to Roomsily`,
      react: ReferralInviteEmail({
        inviterName: profile?.full_name ?? null,
        inviteLink,
        householdName: profile?.unit_id ? "your shared home" : null,
        rewardAmount: Number.isFinite(rewardAmount) ? rewardAmount : undefined,
        currency: process.env.REFERRAL_REWARD_CURRENCY ?? "USD",
      }),
    })

    return NextResponse.json({ invitation, inviteLink })
  } catch (error) {
    console.error("Failed to send referral invite", error)
    return NextResponse.json(
      { error: "Failed to send referral invite" },
      { status: 500 }
    )
  }
}
