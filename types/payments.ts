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

export interface BillingProrationLineItem {
  id: string
  description: string
  amount: number
  isProration: boolean
  periodStart?: string
  periodEnd?: string
}

export interface BillingProrationPreview {
  currency: string
  subtotal: number
  total: number
  prorationAmount: number
  nextInvoiceDate: string
  lineItems: BillingProrationLineItem[]
}

export interface BillingCreditBalanceSummary {
  currency: string
  customerBalance: number
  cashBalance: number
  totalAvailable: number
}

export type BillingReconciliationDirection = "charge" | "credit"
export type BillingReconciliationSource = "proration" | "credit_balance"

export interface BillingReconciliationLogEntry {
  id: string
  occurredAt: string
  description: string
  amount: number
  direction: BillingReconciliationDirection
  source: BillingReconciliationSource
}

export interface BillingPreview {
  proration: BillingProrationPreview
  credits: BillingCreditBalanceSummary
  reconciliationLog: BillingReconciliationLogEntry[]
}
