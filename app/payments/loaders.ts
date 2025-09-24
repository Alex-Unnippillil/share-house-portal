"use server"

import "server-only"

import { catchUpBalances, receiptHistory } from "@/lib/payments/mock-data"
import {
  buildTenantBillingContext,
  type BillingProfileRow,
  type TenantBillingContext,
} from "@/lib/payments/billing"
import { createClient } from "@/utils/supabase/server"
import type {
  CatchUpBalance,
  PaymentReceiptHistoryEntry,
} from "@/types/payments"


export async function loadCatchUpBalances(): Promise<CatchUpBalance[]> {
  return catchUpBalances
}

export async function loadReceiptHistory(): Promise<PaymentReceiptHistoryEntry[]> {
  return receiptHistory

}

export async function loadTenantBillingContext(): Promise<TenantBillingContext | null> {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error("Failed to read authenticated user for billing context", authError)
  }

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id, unit_id, metadata")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    console.error("Failed to load tenant billing profile", error)
  }

  const profile = (data as BillingProfileRow | null) ?? null

  return buildTenantBillingContext({ userId: user.id, profile })
}
