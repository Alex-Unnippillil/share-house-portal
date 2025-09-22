"use server"

import "server-only"

import { catchUpBalances } from "@/lib/payments/mock-data"
import type { CatchUpBalance } from "@/types/payments"

export async function loadCatchUpBalances(): Promise<CatchUpBalance[]> {
  return catchUpBalances
}
