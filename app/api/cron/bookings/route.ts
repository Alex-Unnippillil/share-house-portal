import { NextResponse } from 'next/server'

import { processBookingNoShows, processBookingReminders, SupabaseBookingRepository } from '@/lib/bookings'
import { createBookingNotificationService } from '@/lib/notifications/service'
import { createServiceRoleSupabaseClient } from '@/lib/supabase-admin'

export async function POST() {
  return runCron()
}

export async function GET() {
  return runCron()
}

async function runCron() {
  try {
    const supabase = createServiceRoleSupabaseClient()
    const repository = new SupabaseBookingRepository(supabase)
    const notifications = createBookingNotificationService()
    const now = new Date()

    const reminderResult = await processBookingReminders(repository, notifications, { now })
    const noShowResult = await processBookingNoShows(repository, notifications, { now })

    return NextResponse.json({
      reminderResult,
      noShowResult,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
