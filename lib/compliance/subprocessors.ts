"use server"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import type { Database } from "@/lib/supabase"
import { sendEmailNotification } from "@/lib/notifications"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

export type SubprocessorRecord = Database["public"]["Tables"]["subprocessors"]["Row"]
export type SubprocessorSubscriptionRecord = Database["public"]["Tables"]["subprocessor_subscriptions"]["Row"]
export type SubprocessorChangeLogRow = Database["public"]["Tables"]["subprocessor_change_log"]["Row"]

export type SubprocessorChange = {
  vendor: string
  change: string
  dataImpacts?: string[]
  action?: string
}

export type SubprocessorChangeLogEntry = Omit<SubprocessorChangeLogRow, "changes"> & {
  changes: SubprocessorChange[]
}

const changeLogInsertSchema = z.object({
  title: z.string().min(1, "A title is required."),
  summary: z.string().min(1, "A short summary is required."),
  effectiveAt: z.union([z.string(), z.date()]),
  changes: z
    .array(
      z.object({
        vendor: z.string().min(1, "Vendor name is required."),
        change: z.string().min(1, "A change summary is required."),
        dataImpacts: z.array(z.string()).optional(),
        action: z.string().optional(),
      })
    )
    .min(1, "Provide at least one change detail."),
})

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let serviceClient: SupabaseClient<Database> | null = null

function getServiceClient() {
  if (!serviceClient) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase service configuration is missing")
    }

    serviceClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return serviceClient
}

function normalizeChangeLogRow(row: SubprocessorChangeLogRow): SubprocessorChangeLogEntry {
  const rawChanges = Array.isArray(row.changes) ? row.changes : []

  const parsedChanges = rawChanges
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null
      }

      const record = entry as Record<string, unknown>
      const vendor = typeof record.vendor === "string" ? record.vendor : "Vendor update"
      const change = typeof record.change === "string" ? record.change : ""
      const dataImpacts = Array.isArray(record.dataImpacts)
        ? record.dataImpacts.filter((value): value is string => typeof value === "string")
        : undefined
      const action = typeof record.action === "string" ? record.action : undefined

      if (!change) {
        return null
      }

      return {
        vendor,
        change,
        dataImpacts,
        action,
      }
    })
    .filter((entry): entry is SubprocessorChange => Boolean(entry))

  return {
    ...row,
    changes: parsedChanges,
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function fetchSubprocessors() {
  const supabase = await createSupbaseServerClientReadOnly()
  const { data, error } = await supabase
    .from("subprocessors")
    .select("*")
    .eq("status", "active")
    .order("name", { ascending: true })

  if (error) {
    console.error("Failed to fetch subprocessors", error)
    throw new Error("Unable to load subprocessors at this time")
  }

  return (data ?? []).map((row) => ({
    ...row,
    services: row.services ?? [],
    data_types: row.data_types ?? [],
  })) as SubprocessorRecord[]
}

export async function fetchSubprocessorChangeLog(limit?: number) {
  const supabase = await createSupbaseServerClientReadOnly()
  let query = supabase
    .from("subprocessor_change_log")
    .select("*")
    .order("effective_at", { ascending: false })
    .order("published_at", { ascending: false })

  if (typeof limit === "number") {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error("Failed to fetch subprocessor change log", error)
    throw new Error("Unable to load change log entries at this time")
  }

  return (data ?? []).map(normalizeChangeLogRow)
}

export async function createSubprocessorChangeLogEntry(input: z.infer<typeof changeLogInsertSchema>) {
  const parsed = changeLogInsertSchema.parse(input)
  const supabase = getServiceClient()

  const effectiveDate =
    parsed.effectiveAt instanceof Date
      ? parsed.effectiveAt.toISOString().slice(0, 10)
      : parsed.effectiveAt

  const { data, error } = await supabase
    .from("subprocessor_change_log")
    .insert({
      title: parsed.title,
      summary: parsed.summary,
      effective_at: effectiveDate,
      changes: parsed.changes,
    })
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to create subprocessor change log entry", error)
    throw new Error("Could not create change log entry")
  }

  const normalized = normalizeChangeLogRow(data)

  try {
    const { data: subscribers, error: subscriberError } = await supabase
      .from("subprocessor_subscriptions")
      .select("email")
      .eq("status", "active")

    if (subscriberError) {
      throw subscriberError
    }

    const recipients = (subscribers ?? [])
      .map((subscriber) => subscriber.email)
      .filter((email): email is string => Boolean(email))

    if (recipients.length > 0) {
      const result = await sendEmailNotification({
        to: recipients,
        subject: `Roomsily subprocessor update: ${normalized.title}`,
        template: "subprocessor-update",
        data: {
          title: normalized.title,
          summary: normalized.summary,
          effectiveDate: normalized.effective_at,
          changes: normalized.changes,
        },
      })

      if (!result.success) {
        console.error("Failed to dispatch subprocessor update email", result.error)
      }
    }
  } catch (error) {
    console.error("Subprocessor update notification error", error)
  }

  return normalized
}

export async function subscribeEmailToSubprocessorUpdates(email: string) {
  const { email: validatedEmail } = emailSchema.parse({ email })
  const normalizedEmail = normalizeEmail(validatedEmail)
  const supabase = getServiceClient()

  const timestamp = new Date().toISOString()

  const { data, error } = await supabase
    .from("subprocessor_subscriptions")
    .upsert(
      {
        email: normalizedEmail,
        status: "active",
        confirmed_at: timestamp,
        confirmation_token: null,
        unsubscribed_at: null,
        updated_at: timestamp,
      },
      { onConflict: "email" }
    )
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to subscribe to subprocessor updates", error)
    throw new Error("Unable to subscribe right now")
  }

  return data
}

export async function unsubscribeEmailFromSubprocessorUpdates(email: string) {
  const { email: validatedEmail } = emailSchema.parse({ email })
  const normalizedEmail = normalizeEmail(validatedEmail)
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from("subprocessor_subscriptions")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("email", normalizedEmail)
    .select()
    .maybeSingle()

  if (error) {
    console.error("Failed to unsubscribe from subprocessor updates", error)
    throw new Error("Unable to update subscription status")
  }

  return data
}
