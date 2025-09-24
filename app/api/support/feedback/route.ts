import { NextResponse } from "next/server"
import { z } from "zod"

import { getServiceRoleSupabaseClient } from "@/utils/supabase-service-role"

const consoleEntrySchema = z.object({
  level: z.enum(["log", "info", "warn", "error", "debug"]),
  message: z.string(),
  timestamp: z.string(),
})

const networkEntrySchema = z.object({
  method: z.string(),
  url: z.string(),
  status: z.number().optional().nullable(),
  ok: z.boolean().optional().nullable(),
  durationMs: z.number().optional().nullable(),
  error: z.string().optional().nullable(),
  timestamp: z.string(),
})

const attachmentSchema = z.object({
  filename: z.string(),
  content: z.string(),
  contentType: z.string(),
})

const feedbackSchema = z.object({
  notes: z.string().max(2000).optional(),
  consoleLogs: z.array(consoleEntrySchema).default([]),
  networkEntries: z.array(networkEntrySchema).default([]),
  attachments: z.array(attachmentSchema).default([]),
  pageUrl: z.string().optional(),
  userAgent: z.string().optional(),
  timezone: z.string().optional(),
})

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsed = feedbackSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid feedback payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = getServiceRoleSupabaseClient()

  if (!supabase) {
    console.error("Support feedback submission attempted without Supabase configuration.")
    return NextResponse.json(
      { error: "Support channel is not configured" },
      { status: 503 }
    )
  }

  const { notes, consoleLogs, networkEntries, attachments, pageUrl, userAgent, timezone } = parsed.data

  const { data, error } = await supabase
    .from("support_feedback")
    .insert({
      notes: notes ?? null,
      page_url: pageUrl ?? null,
      user_agent: userAgent ?? null,
      timezone: timezone ?? null,
      console_logs: consoleLogs,
      network_har: networkEntries,
      attachments,
    })
    .select("id")
    .single()

  if (error) {
    console.error("Failed to persist support feedback", error)
    return NextResponse.json(
      { error: "Unable to persist feedback" },
      { status: 500 }
    )
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
