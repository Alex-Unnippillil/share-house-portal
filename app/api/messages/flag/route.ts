import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"

const flagRequestSchema = z.object({
  messageId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(5, { message: "Reason must be at least 5 characters." })
    .max(500, { message: "Reason must be 500 characters or fewer." }),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
})

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore) as SupabaseClient<Database>

    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth?.user) {
      return jsonError("AUTH_UNAUTHORIZED")
    }

    const payload = await request.json()
    const parsed = flagRequestSchema.safeParse(payload)

    if (!parsed.success) {
      return jsonError("REQUEST_VALIDATION_ERROR", {
        message: "Invalid flag payload",
        details: parsed.error.flatten(),
      })
    }

    const { messageId, reason, severity } = parsed.data

    const {
      data: message,
      error: messageError,
    } = await supabase
      .from("messages")
      .select("id, flagged_count")
      .eq("id", messageId)
      .maybeSingle()

    if (messageError) {
      return jsonErrorFromUnknown(messageError)
    }

    if (!message) {
      return jsonError("DATA_FETCH_FAILED", {
        status: 404,
        message: "Message not found",
      })
    }

    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from("messages")
      .update({
        flagged_count: (message.flagged_count ?? 0) + 1,
        last_flagged_at: now,
      })
      .eq("id", messageId)

    if (updateError) {
      return jsonErrorFromUnknown(updateError)
    }

    const {
      data: flag,
      error: flagError,
    } = await supabase
      .from("message_flags")
      .insert({
        message_id: messageId,
        flagged_by: auth.user.id,
        reason,
        severity,
      })
      .select(
        "id, message_id, status, severity, reason, created_at"
      )
      .single()

    if (flagError) {
      return jsonErrorFromUnknown(flagError)
    }

    return Response.json({
      flag,
      message: {
        id: messageId,
        flagged_count: (message.flagged_count ?? 0) + 1,
        last_flagged_at: now,
      },
    })
  } catch (error) {
    return jsonErrorFromUnknown(error)
  }
}
