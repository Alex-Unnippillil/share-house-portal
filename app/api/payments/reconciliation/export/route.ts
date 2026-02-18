import { createClient } from "@/utils/supabase/server"

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

    if (!profile || !["property_manager", "admin"].includes(profile.role ?? "")) {
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

    const lines = (data ?? []).map((row) => {
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

    const csv = [header.join(","), ...lines].join("\n")

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
