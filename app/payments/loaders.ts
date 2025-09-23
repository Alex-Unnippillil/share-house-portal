"use server"

import "server-only"

import { catchUpBalances, roommateLedgers } from "@/lib/payments/mock-data"
import type { CatchUpBalance, RoommateLedger } from "@/types/payments"

export async function loadCatchUpBalances(): Promise<CatchUpBalance[]> {
  return catchUpBalances
}

export async function loadRoommateLedgers(): Promise<RoommateLedger[]> {
  return roommateLedgers
}
