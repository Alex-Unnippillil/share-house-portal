import { NextResponse } from "next/server"
import { z } from "zod"

import { fetchMemberProfile, fetchMembersByUnit } from "@/lib/data/members"
import { sendBulkNotifications } from "@/lib/notifications"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import { createSupbaseServerClient } from "@/utils/supaone"

const attachmentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
})

const messageSchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(1),
  attachments: z.array(attachmentSchema).optional(),
})

export async function POST(request: Request) {
  try {
    const payload = messageSchema.parse(await request.json())

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: true,
          message: {
            id: `offline-${Date.now()}`,
            ...payload,
            created_at: new Date().toISOString(),
          },
          warnings: [
            "Supabase configuration missing; returning stubbed response.",
          ],
        },
        { status: 200 }
      )
    }

    const supabase = await createSupbaseServerClient()
    const typedSupabase = supabase as unknown as TypedSupabaseClient

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const profile = await fetchMemberProfile(typedSupabase, user.id)
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      )
    }

    if (!profile.unit_id) {
      return NextResponse.json(
        { success: false, error: "User is not assigned to a unit" },
        { status: 400 }
      )
    }

    const unitMembers = await fetchMembersByUnit(typedSupabase, profile.unit_id, {
      excludeUserId: user.id,
    })

    const messageMetadata = {
      threadId: payload.threadId,
      attachments: payload.attachments ?? [],
      author: {
        id: profile.id,
        name: profile.full_name || profile.email || "Unknown",
      },
    }

    const { data: messageLog, error: logError } = await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        title: payload.threadId,
        message: payload.content,
        type: "info",
        action_url: `/messaging/${payload.threadId}`,
        metadata: messageMetadata,
      })
      .select()
      .single()

    if (logError) {
      console.warn("Failed to log message for sender", logError)
    }

    const broadcastNotifications = unitMembers.map((member) => ({
      userId: member.id,
      title: `New reply in ${payload.threadId}`,
      message: payload.content,
      type: "info" as const,
      actionUrl: `/messaging/${payload.threadId}`,
      metadata: messageMetadata,
    }))

    const notificationResults = broadcastNotifications.length
      ? await sendBulkNotifications(broadcastNotifications)
      : []

    return NextResponse.json({
      success: true,
      message: messageLog ?? {
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        title: payload.threadId,
        message: payload.content,
        metadata: messageMetadata,
      },
      notifications: notificationResults,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.flatten() },
        { status: 400 }
      )
    }

    console.error("Failed to process message", error)
    const message =
      error instanceof Error ? error.message : "Failed to post message"

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
