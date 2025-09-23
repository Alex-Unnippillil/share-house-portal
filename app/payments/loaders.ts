"use server"

import "server-only"

import {
  catchUpBalances,
  receiptHistory,
  roommateLedgers,
} from "@/lib/payments/mock-data"
import type {
  CatchUpBalance,
  PaymentReceiptHistoryEntry,
  RoommateLedger,
} from "@/types/payments"


export async function loadCatchUpBalances(): Promise<CatchUpBalance[]> {
  return catchUpBalances
}

export async function loadReceiptHistory(): Promise<PaymentReceiptHistoryEntry[]> {
  return receiptHistory
}

export async function loadRoommateLedgers(): Promise<RoommateLedger[]> {
  return roommateLedgers
}
