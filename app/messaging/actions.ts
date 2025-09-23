"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { insertThreadMessage } from "@/lib/data/messages"
import type { SaveMessageInput } from "@/lib/data/messages"
import { createActionClient } from "@/utils/supabase/actions"

const messageSchema = z.object({
  threadId: z.string().min(1, "Thread is required."),
  authorId: z.string().uuid("Author must be a valid UUID."),
  contentHtml: z.string().min(1, "Message cannot be empty."),
  contentMarkdown: z.string().min(1, "Message cannot be empty."),
})

export type SaveMessageActionInput = SaveMessageInput

export async function saveMessage(input: SaveMessageActionInput) {
  const parsed = messageSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Message is invalid.",
    }
  }

  try {
    const supabase = await createActionClient()

    await insertThreadMessage({
      client: supabase,
      message: parsed.data,
    })

    revalidatePath("/messaging")

    return { success: true as const }
  } catch (error) {
    console.error("saveMessage", error)

    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to save message.",
    }
  }
}
