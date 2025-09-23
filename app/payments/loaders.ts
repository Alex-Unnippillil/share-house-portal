"use server"

import "server-only"

import { catchUpBalances, receiptHistory } from "@/lib/payments/mock-data"
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
