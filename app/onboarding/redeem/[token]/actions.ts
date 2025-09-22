"use server"

import { cookies } from "next/headers"

import { createClient } from "@/utils/supa-server-actions"

type CompleteInviteInput = {
  inviteToken: string
  fullName: string
  phone: string
  rentShare: number | null
  notes: string
  acceptPolicies: boolean
}

type CompleteInviteResult = {
  ok: boolean
  message: string
}

export async function completeInviteRedemption(input: CompleteInviteInput): Promise<CompleteInviteResult> {
  if (!input.acceptPolicies) {
    return {
      ok: false,
      message: "You must accept the household policies to continue.",
    }
  }

  const cookieStore = cookies()
  const client = createClient(cookieStore)

  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  if (!hasSupabaseConfig) {
    return {
      ok: true,
      message: "Invite captured locally. Configure Supabase to persist acceptance.",
    }
  }

  const updatePayload = {
    status: "accepted" as const,
    metadata: {
      ...input,
      completedAt: new Date().toISOString(),
    },
  }

  const { error } = await client
    .from("household_invites")
    .update(updatePayload)
    .eq("token", input.inviteToken)

  if (error) {
    return {
      ok: false,
      message: error.message ?? "Unable to redeem invite right now.",
    }
  }

  return {
    ok: true,
    message: "Invite redeemed! Welcome to your new household.",
  }
}
