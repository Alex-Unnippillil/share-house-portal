import "server-only"

import { createSupbaseServerClientReadOnly } from "@/utils/supaone"
import { normalizeFinanceRevenueRow } from "@/lib/finance/revenue"

export const FINANCE_STAFF_ROLES = new Set(["property_manager", "admin", "landlord"])

export type FinanceDashboardData = {
  isAuthorized: boolean
  lines: ReturnType<typeof normalizeFinanceRevenueRow>[]
}

export async function loadFinanceDashboard(): Promise<FinanceDashboardData> {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const userId = session?.user?.id
  if (!userId) {
    return { isAuthorized: false, lines: [] }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  if (!profile || !profile.role || !FINANCE_STAFF_ROLES.has(profile.role)) {
    return { isAuthorized: false, lines: [] }
  }

  const { data, error } = await supabase
    .from("finance_revenue_summary")
    .select("*")
    .order("period_start", { ascending: false })

  if (error) {
    throw new Error(`Failed to load finance revenue summary: ${error.message}`)
  }

  const rows = Array.isArray(data) ? data : []
  return {
    isAuthorized: true,
    lines: rows.map((row) => normalizeFinanceRevenueRow(row)),
  }
}
