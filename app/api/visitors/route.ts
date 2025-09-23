import { NextResponse } from "next/server"
import { z } from "zod"

import { fetchMemberProfile, fetchMembersByUnit } from "@/lib/data/members"
import { sendBulkNotifications } from "@/lib/notifications"
import type { MemberProfile } from "@/lib/data/members"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import { createSupbaseServerClient } from "@/utils/supaone"

const visitorSchema = z.object({
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional().nullable(),
  checkInDate: z.string().min(1),
  checkOutDate: z.string().min(1),
  purpose: z.string().min(10),
  emergencyContact: z.string().optional().nullable(),
  specialNotes: z.string().optional().nullable(),
})

function buildVisitorNotifications(
  host: MemberProfile,
  roommates: MemberProfile[],
  propertyManager: MemberProfile,
  payload: z.infer<typeof visitorSchema>
) {
  const hostName = host.full_name || host.email || "Unknown"

  const templateData = {
    guestName: payload.guestName,
    hostName,
    checkInDate: payload.checkInDate,
    checkOutDate: payload.checkOutDate,
    purpose: payload.purpose,
  }

  const notifications = [] as Parameters<typeof sendBulkNotifications>[0]

  const emailRecipients = [propertyManager, ...roommates].filter(
    (member) => Boolean(member.email)
  )

  for (const member of emailRecipients) {
    notifications.push({
      to: member.email!,
      subject: `Visitor Booking: ${payload.guestName}`,
      template: "visitor-booking",
      data: templateData,
      userId: member.id,
    })
  }

  notifications.push({
    userId: propertyManager.id,
    title: "New Visitor Booking",
    message: `${payload.guestName} visiting ${hostName} (${payload.checkInDate} → ${payload.checkOutDate})`,
    type: "info",
    actionUrl: "/visitors",
    metadata: templateData,
  })

  for (const roommate of roommates) {
    notifications.push({
      userId: roommate.id,
      title: "Overnight visitor registered",
      message: `${hostName} logged ${payload.guestName} (${payload.checkInDate} → ${payload.checkOutDate})`,
      type: "info",
      actionUrl: "/visitors",
      metadata: templateData,
    })
  }

  return notifications
}

export async function POST(request: Request) {
  try {
    const payload = visitorSchema.parse(await request.json())

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: true,
          booking: {
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

    const hostProfile = await fetchMemberProfile(typedSupabase, user.id)
    if (!hostProfile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      )
    }

    if (!hostProfile.unit_id) {
      return NextResponse.json(
        { success: false, error: "User is not assigned to a unit" },
        { status: 400 }
      )
    }

    const unitMembers = await fetchMembersByUnit(typedSupabase, hostProfile.unit_id, {
      excludeUserId: user.id,
    })

    const roommates = unitMembers.filter((member) =>
      ["tenant", "roommate"].includes(member.role ?? "")
    )

    const propertyManager = unitMembers.find(
      (member) => member.role === "property_manager"
    )

    if (!propertyManager) {
      return NextResponse.json(
        { success: false, error: "Property manager not found" },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from("visitor_logs")
      .insert({
        guest_name: payload.guestName,
        guest_email: payload.guestEmail,
        guest_phone: payload.guestPhone || null,
        host_id: user.id,
        check_in_date: payload.checkInDate,
        check_out_date: payload.checkOutDate,
        purpose: payload.purpose,
        emergency_contact: payload.emergencyContact || null,
        special_notes: payload.specialNotes || null,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    const notifications = buildVisitorNotifications(
      hostProfile,
      roommates,
      propertyManager,
      payload
    )

    const notificationResults = await sendBulkNotifications(notifications)

    return NextResponse.json({
      success: true,
      booking: data,
      notifications: notificationResults,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.flatten() },
        { status: 400 }
      )
    }

    console.error("Failed to process visitor booking", error)
    const message =
      error instanceof Error ? error.message : "Failed to submit visitor booking"

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
