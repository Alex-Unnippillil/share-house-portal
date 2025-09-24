import { NextResponse } from "next/server"

import { buildRevenueCsv, normalizeFinanceRevenueRow } from "@/lib/finance/revenue"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"
import { FINANCE_STAFF_ROLES } from "../loaders"

export async function GET() {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  if (!profile || !profile.role || !FINANCE_STAFF_ROLES.has(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("finance_revenue_summary")
    .select("*")
    .order("period_start", { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: "Failed to build export" },
      { status: 500 },
    )
  }

  const rows = Array.isArray(data) ? data : []
  const lines = rows.map((row) => normalizeFinanceRevenueRow(row))
  const csv = buildRevenueCsv(lines)
  const filename = `finance-revenue-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
