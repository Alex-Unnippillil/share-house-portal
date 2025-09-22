import { randomUUID } from "crypto"

export type SettlementMode = "invoice" | "payment_intent"

export interface SettlementAdjustment {
  roommate: string
  amount: number
  memo?: string
}

export interface PaymentRecord {
  id: string
  mode: SettlementMode
  vendor: string
  purchaseDate: string
  total: number
  memo?: string
  adjustments: SettlementAdjustment[]
  status: string
  reference?: string
  createdAt: string
}

const ledger: PaymentRecord[] = []

export function recordPayment(entry: Omit<PaymentRecord, "id" | "createdAt">): PaymentRecord {
  const record: PaymentRecord = {
    ...entry,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  }

  ledger.push(record)

  return record
}

export function listPayments(): PaymentRecord[] {
  return [...ledger]
}

export function __resetLedgerForTesting() {
  ledger.length = 0
}
