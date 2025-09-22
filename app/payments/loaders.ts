"use server"

import "server-only"

import { autopaySchedule, catchUpBalances } from "@/lib/payments/mock-data"
import type { AutopayScheduleConfig, CatchUpBalance } from "@/types/payments"

export async function loadCatchUpBalances(): Promise<CatchUpBalance[]> {
  return catchUpBalances
}

export async function loadAutopaySchedule(): Promise<AutopayScheduleConfig> {
  return autopaySchedule
}
