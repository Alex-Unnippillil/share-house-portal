import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import type { Database, TablesInsert, Json } from "@/lib/supabase"

const ratingEnum = z.enum(["good", "needs-improvement", "poor"])

const metadataSchema: z.ZodType<Record<string, unknown>> = z
  .record(z.any())
  .optional()

const vitalsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  value: z.number(),
  delta: z.number().optional(),
  rating: ratingEnum,
  label: z.string().optional(),
  eventName: z.string().optional(),
  navigationType: z.string().optional(),
  url: z.string().url(),
  route: z.string().min(1),
  metadata: metadataSchema,
  timestamp: z.number().optional(),
})

function createSupabaseAdminClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    console.error("Supabase credentials missing for vitals ingestion")
    return null
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  const parsed = vitalsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid vitals payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  const supabase = createSupabaseAdminClient()
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured" },
      { status: 500 }
    )
  }

  const data = parsed.data
  const recordedAt = data.timestamp
    ? new Date(data.timestamp).toISOString()
    : new Date().toISOString()

  const metadata = (data.metadata ?? null) as Json | null

  const metric: TablesInsert<'web_vitals'> = {
    metric_id: data.id,
    name: data.name,
    value: data.value,
    delta: data.delta ?? null,
    rating: data.rating,
    label: data.label ?? null,
    event_name: data.eventName ?? null,
    navigation_type: data.navigationType ?? null,
    url: data.url,
    route: data.route,
    metadata,
    recorded_at: recordedAt,
  }

  const { error } = await supabase.from('web_vitals').insert(metric)

  if (error) {
    console.error("Failed to record web vitals", error)
    return NextResponse.json(
      { success: false, error: "Unable to store vitals" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
