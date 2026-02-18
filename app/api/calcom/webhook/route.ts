import crypto from "node:crypto"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { toBookingInsert } from "@/lib/bookings/calcom-webhook"
import type { Database, TablesInsert } from "@/lib/supabase"

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.CALCOM_WEBHOOK_SECRET
  if (!secret) {
    return true
  }

  if (!signature) {
    return false
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")

  const provided = signature.replace("sha256=", "")
  if (provided.length !== expectedSignature.length) {
    return false
  }

  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expectedSignature))
}

async function upsertBookingRecord(
  supabase: SupabaseClient<Database>,
  booking: TablesInsert<"bookings">,
) {
  const sourceId = booking.source_booking_id
  if (!sourceId) {
    return { error: new Error("Missing source booking ID") }
  }

  return supabase
    .from("bookings")
    .upsert(booking, {
      onConflict: "source,source_booking_id",
      ignoreDuplicates: false,
    })
}

export async function POST(request: Request) {
  const signature =
    request.headers.get("x-cal-signature") ?? request.headers.get("x-calcom-signature")
  const rawBody = await request.text()

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, message: "Invalid signature" }, { status: 401 })
  }

  let parsedBody
  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 })
  }

  const booking = toBookingInsert(parsedBody)
  if (!booking) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const supabase = createSupabaseAdminClient()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Supabase admin client unavailable" },
      { status: 500 },
    )
  }

  const { error } = await upsertBookingRecord(supabase, booking)
  if (error) {
    return NextResponse.json(
      { ok: false, message: "Failed to mirror booking", details: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    mirrored: true,
    sourceBookingId: booking.source_booking_id,
    status: booking.status,
  })
}
