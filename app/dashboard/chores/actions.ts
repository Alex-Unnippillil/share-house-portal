"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createSupbaseServerClient } from "@/utils/supaone"

import type { SwapActionResult } from "@/components/chores/types"

const swapIdSchema = z.object({
  swapId: z.number().int().positive(),
})

const declineSchema = swapIdSchema.extend({
  reason: z
    .string()
    .trim()
    .max(280, { message: "Decline reason must be 280 characters or fewer." })
    .optional(),
})

const CHORE_SWAPS_PATH = "/dashboard/chores"

async function getAuthenticatedClient() {
  const supabase = await createSupbaseServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error("You must be signed in to manage chore swaps.")
  }

  return { supabase, userId: data.user.id }
}

export async function acceptChoreSwapAction(formData: FormData): Promise<SwapActionResult> {
  const swapId = Number(formData.get("swapId"))
  const parsed = swapIdSchema.safeParse({ swapId })

  if (!parsed.success) {
    return { success: false, error: "Invalid swap identifier provided." }
  }

  try {
    const { supabase } = await getAuthenticatedClient()
    const { error } = await supabase.rpc("accept_chore_swap", {
      p_swap_id: parsed.data.swapId,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(CHORE_SWAPS_PATH)
    return {
      success: true,
      message: "Swap accepted. Credits have been transferred.",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to accept chore swap.",
    }
  }
}

export async function declineChoreSwapAction(formData: FormData): Promise<SwapActionResult> {
  const swapId = Number(formData.get("swapId"))
  const rawReason = formData.get("reason")
  const parsed = declineSchema.safeParse({
    swapId,
    reason: typeof rawReason === "string" ? rawReason : undefined,
  })

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Unable to decline chore swap because the submitted data was invalid.",
    }
  }

  try {
    const { supabase } = await getAuthenticatedClient()
    const { error } = await supabase.rpc("decline_chore_swap", {
      p_swap_id: parsed.data.swapId,
      p_reason: parsed.data.reason ?? null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(CHORE_SWAPS_PATH)
    return {
      success: true,
      message: parsed.data.reason ? "Declined with context for your roommate." : "Swap declined.",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to decline chore swap.",
    }
  }
}
