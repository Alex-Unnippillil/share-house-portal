export type AutopayStatus = "active" | "paused" | "disabled"

export type CatchUpChargeCategory =
  | "rent"
  | "utilities"
  | "fees"
  | "deposit"
  | "maintenance"
  | "parking"
  | "other"

export interface CatchUpCharge {
  id: string
  description: string
  category: CatchUpChargeCategory
  dueDate: string
  originalAmount: number
  outstandingAmount: number
  invoiceId?: string
  invoiceNumber?: string
  isPropertyManagerAdjustment?: boolean
}

export interface CatchUpContact {
  name: string
  email: string
}

export interface CatchUpContacts {
  primary: CatchUpContact
  roommates?: CatchUpContact[]
  propertyManager?: CatchUpContact
}

export interface CatchUpBalance {
  roommateId: string
  roommateName: string
  unitLabel: string
  currency: string
  monthlyShare: number
  autopayDay: number
  autopayStatus: AutopayStatus
  lastPaymentDate: string
  lastPaymentAmount: number
  charges: CatchUpCharge[]
  contacts: CatchUpContacts
}

export interface CatchUpPaymentAllocation {
  chargeId: string
  amount: number
}

export interface CatchUpPaymentAllocationDetail extends CatchUpPaymentAllocation {
  description: string
  category: CatchUpChargeCategory
  dueDate: string
  remainingBalance: number
  invoiceId: string
  invoiceNumber: string
  isPropertyManagerAdjustment: boolean
}

export interface CatchUpPaymentInvoiceSettlement {
  invoiceId: string
  invoiceNumber: string
  appliedAmount: number
  previousOutstanding: number
  remainingBalance: number
  chargeCount: number
  coveragePercentage: number
  fullyCovered: boolean
}

export interface CatchUpPropertyManagerAdjustmentLog {
  chargeId: string
  description: string
  amount: number
  remainingBalance: number
  invoiceNumber: string
  manager: CatchUpContact
}

export interface CatchUpPaymentSubmissionResult {
  paymentIntentId: string
  roommateId: string
  roommateName: string
  amount: number
  currency: string
  projectedBalance: number
  allocations: CatchUpPaymentAllocationDetail[]
  recipients: CatchUpContact[]
  autopayStatus: AutopayStatus
  autopayDay: number
  note?: string
  invoiceSettlements: CatchUpPaymentInvoiceSettlement[]
  propertyManagerAdjustments: CatchUpPropertyManagerAdjustmentLog[]
}

export interface CatchUpPaymentFormValues {
  roommateId: string
  amount: string
  includePropertyManager: boolean
  note?: string
}

export type PaymentReceiptStatus = "paid" | "processing" | "refunded"

export interface PaymentReceiptLineItem {
  id: string
  description: string
  category: CatchUpChargeCategory
  quantity?: number
  unitAmount?: number
  totalAmount: number
}

export interface PaymentReceiptHistoryEntry {
  id: string
  issuedTo: string
  paymentDate: string
  currency: string
  amount: number
  status: PaymentReceiptStatus
  paymentMethod: string
  periodStart?: string
  periodEnd?: string
  receiptUrl: string
  invoiceUrl?: string
  memo?: string
  lineItems: PaymentReceiptLineItem[]

}

export type LedgerActorRole = "roommate" | "property_manager"

export interface LedgerActor {
  id: string
  name: string
  role: LedgerActorRole
}

export type LedgerEntryType = "contribution" | "adjustment"

export interface LedgerEntry {
  id: string
  date: string
  description: string
  note?: string
  amount: number
  type: LedgerEntryType
  actor: LedgerActor
}

export interface RoommateLedger {
  roommateId: string
  roommateName: string
  unitLabel: string
  currency: string
  startingBalance: number
  entries: LedgerEntry[]
}
