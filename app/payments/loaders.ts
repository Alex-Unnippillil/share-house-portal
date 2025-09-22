
"use server"

import "server-only"

import { getCatchUpBalances } from "@/lib/payments/mock-data"
import type { CatchUpBalance } from "@/types/payments"

export async function loadCatchUpBalances(): Promise<CatchUpBalance[]> {
  return getCatchUpBalances()
}
