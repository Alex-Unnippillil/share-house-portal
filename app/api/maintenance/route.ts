import { NextResponse } from "next/server"
import { z } from "zod"

import { fetchMemberProfile, fetchMembersByUnit } from "@/lib/data/members"
import { sendBulkNotifications } from "@/lib/notifications"
import type { MemberProfile } from "@/lib/data/members"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import { createSupbaseServerClient } from "@/utils/supaone"

const maintenanceSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  category: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
})

function buildNotificationPayload(
  requester: MemberProfile,
  propertyManager: MemberProfile,
  payload: z.infer<typeof maintenanceSchema>
) {
  const requesterName = requester.full_name || requester.email || "Unknown"

  const templateData = {
    requesterName,
    title: payload.title,
    description: payload.description,
    priority: payload.priority,
  }

  const notifications = [] as Parameters<typeof sendBulkNotifications>[0]

  if (propertyManager.email) {
    notifications.push({
      to: propertyManager.email,
      subject: `New Maintenance Request: ${payload.title}`,
      template: "maintenance-request",
      data: templateData,
      userId: propertyManager.id,
    })
  }

  notifications.push({
    userId: propertyManager.id,
    title: "New Maintenance Request",
    message: `${requesterName} reported "${payload.title}" (${payload.priority})`,
    type: payload.priority === "urgent" ? "warning" : "info",
    actionUrl: "/maintenance",
    metadata: templateData,
  })

  return notifications
}

export async function POST(request: Request) {
  try {
    const raw = await request.json()
    const payload = maintenanceSchema.parse(raw)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: true,
          request: {
            id: `offline-${Date.now()}`,
            status: "pending",
            ...payload,
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

    const [propertyManager] = await fetchMembersByUnit(typedSupabase, profile.unit_id, {
      roles: ["property_manager"],
    })

    if (!propertyManager) {
      return NextResponse.json(
        { success: false, error: "Property manager not found" },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from("maintenance_requests")
      .insert({
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        category: payload.category || null,
        location: payload.location || null,
        requested_by: user.id,
        unit_id: profile.unit_id,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    const notifications = buildNotificationPayload(
      profile,
      propertyManager,
      payload
    )

    const notificationResults = await sendBulkNotifications(notifications)

    return NextResponse.json({
      success: true,
      request: data,
      notifications: notificationResults,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.flatten() },
        { status: 400 }
      )
    }

    console.error("Failed to process maintenance request", error)
    const message =
      error instanceof Error ? error.message : "Failed to submit maintenance request"

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
