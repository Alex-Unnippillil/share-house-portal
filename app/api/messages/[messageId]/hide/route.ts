import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { transitionFlagStatus } from "@/lib/messaging/escalation"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"

const paramsSchema = z.object({
  messageId: z.string().uuid(),
})

const hideSchema = z.object({
  flagId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(5, { message: "Resolution notes must be at least 5 characters." })
    .max(500, { message: "Resolution notes must be 500 characters or fewer." }),
})

export async function POST(
  request: Request,
  context: { params: { messageId: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore) as SupabaseClient<Database>

    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth?.user) {
      return jsonError("AUTH_UNAUTHORIZED")
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle()

    if (profileError) {
      return jsonErrorFromUnknown(profileError)
    }

    if (!profile || !profile.role || !["admin", "property_manager"].includes(profile.role)) {
      return jsonError("AUTH_UNAUTHORIZED", {
        message: "Only moderators can hide messages.",
      })
    }

    const params = paramsSchema.safeParse(context.params)
    if (!params.success) {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "Invalid message identifier",
        details: params.error.flatten(),
      })
    }

    const body = await request.json()
    const parsed = hideSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "Invalid hide request",
        details: parsed.error.flatten(),
      })
    }

    const { messageId } = params.data
    const { flagId, reason } = parsed.data

    const {
      data: flag,
      error: flagFetchError,
    } = await supabase
      .from("message_flags")
      .select("id, status, message_id")
      .eq("id", flagId)
      .maybeSingle()

    if (flagFetchError) {
      return jsonErrorFromUnknown(flagFetchError)
    }

    if (!flag || flag.message_id !== messageId) {
      return jsonError("DATA_FETCH_FAILED", {
        status: 404,
        message: "Flag not found for message",
      })
    }

    const nextStatus = transitionFlagStatus(flag.status, "hide")
    const now = new Date().toISOString()

    const { error: messageUpdateError } = await supabase
      .from("messages")
      .update({ visible: false })
      .eq("id", messageId)

    if (messageUpdateError) {
      return jsonErrorFromUnknown(messageUpdateError)
    }

    const {
      data: updatedFlag,
      error: updateError,
    } = await supabase
      .from("message_flags")
      .update({
        status: nextStatus,
        resolution_notes: reason,
        moderated_by: auth.user.id,
        moderated_at: now,
      })
      .eq("id", flagId)
      .select(
        "id, status, resolution_notes, moderated_by, moderated_at, message_id"
      )
      .single()

    if (updateError) {
      return jsonErrorFromUnknown(updateError)
    }

    return Response.json({
      flag: updatedFlag,
      message: {
        id: messageId,
        visible: false,
      },
    })
  } catch (error) {
    return jsonErrorFromUnknown(error)
  }
}
