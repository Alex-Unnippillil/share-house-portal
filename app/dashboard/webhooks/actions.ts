"use server"

import { revalidatePath } from "next/cache"

import { webhookDispatcher } from "@/lib/notifications"
import { createSupbaseServerClient } from "@/utils/supaone"

export async function replayWebhookDeadLetter(formData: FormData) {
  const rawId = formData.get("deadLetterId")

  if (typeof rawId !== "string" || rawId.length === 0) {
    return {
      ok: false,
      deadLetterId: null as string | null,
      reason: "invalid_request" as const,
      errorMessage: "A dead letter identifier is required.",
    }
  }

  try {
    const supabase = await createSupbaseServerClient()
    const { data } = await (supabase as any).auth.getUser()
    const userId = data?.user?.id ?? null

    const result = await webhookDispatcher.replayDeadLetter(rawId, {
      triggeredBy: userId,
    })

    if (result.ok) {
      revalidatePath("/dashboard/webhooks")
    }

    return result
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to replay webhook dead letter."

    return {
      ok: false,
      deadLetterId: rawId,
      reason: "enqueue_failed" as const,
      errorMessage: message,
    }
  }
}
