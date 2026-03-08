import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

export type TenantBalanceRow = Database['public']['Views']['tenant_balance_mv']['Row']

export interface TenantBalanceFilters {
  tenantId?: string
  fromMonth?: string
  toMonth?: string
  limit?: number
  ascending?: boolean
}

export interface PortfolioBalanceSummary {
  tenants: number
  months: number
  succeededAmount: number
  pendingAmount: number
  failedAmount: number
  netAmount: number
  lastPaymentAt: string | null
}

export async function loadTenantMonthlyBalances(
  supabase: SupabaseClient<Database>,
  filters: TenantBalanceFilters = {},
): Promise<TenantBalanceRow[]> {
  let query = supabase.from("tenant_balance_mv").select("*")

  if (filters.tenantId) {
    query = query.eq("tenant_id", filters.tenantId)
  }

  if (filters.fromMonth) {
    query = query.gte("month", filters.fromMonth)
  }

  if (filters.toMonth) {
    query = query.lte("month", filters.toMonth)
  }

  query = query.order("month", { ascending: filters.ascending ?? false })

  if (filters.limit && Number.isFinite(filters.limit)) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to load tenant balances: ${error.message}`)
  }

  return data ?? []
}

export async function loadPortfolioBalanceSummary(
  supabase: SupabaseClient<Database>,
  filters: Omit<TenantBalanceFilters, 'limit' | 'ascending'> = {},
): Promise<PortfolioBalanceSummary> {
  const rows = await loadTenantMonthlyBalances(supabase, {
    ...filters,
    ascending: false,
  })

  const tenantIds = new Set<string>()
  const months = new Set<string>()

  let succeededAmount = 0
  let pendingAmount = 0
  let failedAmount = 0
  let netAmount = 0
  let lastPaymentAt: string | null = null

  for (const row of rows) {
    tenantIds.add(row.tenant_id)
    months.add(row.month)

    succeededAmount += Number(row.succeeded_amount ?? 0)
    pendingAmount += Number(row.pending_amount ?? 0)
    failedAmount += Number(row.failed_amount ?? 0)
    netAmount += Number(row.net_amount ?? 0)

    if (row.last_payment_at) {
      if (!lastPaymentAt || row.last_payment_at > lastPaymentAt) {
        lastPaymentAt = row.last_payment_at
      }
    }
  }

  return {
    tenants: tenantIds.size,
    months: months.size,
    succeededAmount,
    pendingAmount,
    failedAmount,
    netAmount,
    lastPaymentAt,
  }
}

export async function loadTenantBalanceForMonth(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  month: string,
): Promise<TenantBalanceRow | null> {
  const { data, error } = await supabase
    .from("tenant_balance_mv")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("month", month)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load tenant balance for ${month}: ${error.message}`)
  }

  return data ?? null
}
