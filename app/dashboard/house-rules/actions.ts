"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getLatestHouseRuleRecord } from "@/queries/house-rules"
import { createSupbaseServerClient } from "@/utils/supaone"

export type PublishHouseRuleState = {
  success: boolean
  message: string | null
}

const publishHouseRuleSchema = z.object({
  content: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, "House rules content is required.")
    .refine((value) => value.length >= 20, "Provide at least 20 characters so roommates get clear guidance."),
})

export async function publishHouseRuleAction(
  _prevState: PublishHouseRuleState,
  formData: FormData,
): Promise<PublishHouseRuleState> {
  const parsed = publishHouseRuleSchema.safeParse({
    content: formData.get("content"),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.flatten().fieldErrors.content?.[0] ?? "Please review the updated house rules and try again.",
    }
  }

  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, message: "You must be signed in to publish house rules." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error("Failed to load profile for house rule publish", profileError)
    return { success: false, message: "Unable to verify your permissions right now." }
  }

  if (!profile || !profile.role || !["admin", "property_manager"].includes(profile.role)) {
    return { success: false, message: "Only admins or property managers can publish new house rules." }
  }

  const { data: latestRule, error: latestError } = await getLatestHouseRuleRecord(supabase)

  if (latestError) {
    console.error("Failed to fetch latest house rule", latestError)
    return { success: false, message: "We couldn't determine the next version. Please try again." }
  }

  const nextVersion = (latestRule?.version ?? 0) + 1

  const { data: insertedRule, error: insertError } = await supabase
    .from("house_rules")
    .insert({
      version: nextVersion,
      content: parsed.data.content,
    })
    .select("*")
    .single()

  if (insertError || !insertedRule) {
    console.error("Failed to insert new house rule", insertError)
    return { success: false, message: "Publishing the house rules failed. Please try again." }
  }

  const channel = supabase.channel("house-rules")
  const broadcastResult = await channel.send({
    type: "broadcast",
    event: "house_rules:published",
    payload: insertedRule,
  })

  if (broadcastResult !== "ok") {
    console.error("Failed to broadcast house rule publish", broadcastResult)
  }

  await supabase.removeChannel(channel)

  revalidatePath("/dashboard/house-rules")
  revalidatePath("/house-rules")

  return {
    success: true,
    message: `Published house rules v${insertedRule.version}.`,
  }
}
