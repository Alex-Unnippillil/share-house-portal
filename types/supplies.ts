export type SupplyShareStatus = "open" | "settled"

export type SupplyShareSettlementMethod = "off_app" | "rent_roll_in"

export type SupplyShareEventType = "created" | "settled" | "reopened"

export interface SupplyShareAuditEvent {
  id: string
  shareId: string
  eventType: SupplyShareEventType
  createdAt: string
  createdBy?: string | null
  createdByName?: string | null
  previousStatus?: SupplyShareStatus | null
  newStatus?: SupplyShareStatus | null
  settlementMethod?: SupplyShareSettlementMethod | null
  settlementInvoiceId?: string | null
  note?: string | null
  context?: Record<string, unknown>
}

export interface SupplyShareLedgerEntry {
  id: string
  description: string
  amount: number
  currency: string
  roommateId: string
  roommateName: string
  status: SupplyShareStatus
  createdAt: string
  updatedAt: string
  createdBy?: string | null
  createdByName?: string | null
  settledAt?: string | null
  settledBy?: string | null
  settledByName?: string | null
  settlementMethod?: SupplyShareSettlementMethod | null
  settlementInvoiceId?: string | null
  settlementNote?: string | null
  auditTrail: SupplyShareAuditEvent[]
}
