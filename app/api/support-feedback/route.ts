import { NextResponse } from "next/server"
import { z } from "zod"

import { createSupbaseServerClient } from "@/utils/supaone"

const feedbackSchema = z.object({
  source: z.string().min(1, "Source is required"),
  action: z.string().min(1, "Action is required"),
  status: z.enum(["pending", "resolved", "escalated"]),
  description: z.string().max(2000).optional(),
  metadata: z.record(z.any()).optional(),
})

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null)
    const parsed = feedbackSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = await createSupbaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      return NextResponse.json(
        { success: false, error: userError.message },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }

    const { error } = await supabase.from("support_feedback_events").insert({
      user_id: user.id,
      source: parsed.data.source,
      action: parsed.data.action,
      status: parsed.data.status,
      description: parsed.data.description ?? null,
      metadata: parsed.data.metadata ?? {},
    })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error logging feedback"

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
