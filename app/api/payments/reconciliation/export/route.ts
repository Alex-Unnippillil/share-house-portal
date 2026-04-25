import { createClient } from "@/utils/supabase/server"

import { isPrivilegedRole } from "@/lib/auth-rbac"
import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}

export async function GET() {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonError("AUTH_UNAUTHORIZED")
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile || !isPrivilegedRole(profile.role)) {
      return jsonError("AUTH_UNAUTHORIZED", {
        message: "Only property managers and admins can export reconciliation CSV.",
      })
    }

    const { data, error } = await supabase
      .from("rent_payments")
      .select("id, amount, currency, status, description, processed_at, metadata, payer_name")
      .eq("status", "failed")
      .order("processed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    const { data: queuedEvents, error: queuedEventsError } = await supabase
      .from("webhook_events")
      .select("event_id, event_type, created_at, error_message, payload")
      .eq("provider", "stripe")
      .eq("status", "failed")
      .ilike("error_message", "%map%tenant%")
      .order("created_at", { ascending: false })

    if (queuedEventsError) {
      throw queuedEventsError
    }

    const header = [
      "payment_id",
      "tenant_name",
      "amount",
      "currency",
      "status",
      "description",
      "processed_at",
      "triage_status",
      "triage_notes",
    ]

    const paymentLines = (data ?? []).map((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>
      return [
        row.id,
        row.payer_name ?? "Unassigned tenant",
        row.amount.toString(),
        row.currency,
        row.status,
        row.description ?? "",
        row.processed_at ?? "",
        typeof metadata.triage_status === "string" ? metadata.triage_status : "open",
        typeof metadata.triage_notes === "string" ? metadata.triage_notes : "",
      ]
        .map((value) => escapeCsv(value))
        .join(",")
    })

    const queuedEventLines = (queuedEvents ?? []).map((event) => {
      const payload = (event.payload ?? {}) as Record<string, unknown>
      const reconciliation = (payload.reconciliation ?? {}) as Record<string, unknown>

      return [
        event.event_id,
        "Unmapped Stripe event",
        "0",
        "USD",
        "unmapped",
        event.event_type,
        event.created_at ?? "",
        typeof reconciliation.triage_status === "string" ? reconciliation.triage_status : "open",
        typeof reconciliation.triage_notes === "string"
          ? reconciliation.triage_notes
          : (event.error_message ?? ""),
      ]
        .map((value) => escapeCsv(value))
        .join(",")
    })

    const csv = [header.join(","), ...queuedEventLines, ...paymentLines].join("\n")

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="failed-payments-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    return jsonErrorFromUnknown(error, "DATA_FETCH_FAILED")
  }
}
