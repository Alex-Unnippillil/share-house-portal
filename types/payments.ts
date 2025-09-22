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
