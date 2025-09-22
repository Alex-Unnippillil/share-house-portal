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

export type LateFeeRule =
  | {
      mode: "flat"
      amount: number
    }
  | {
      mode: "percentage"
      percentage: number
      cap?: number
    }

export interface AutopayRunSummary {
  processedAt: string
  status: "succeeded" | "partial" | "failed"
  totalCollected: number
}

export interface AutopayParticipant {
  roommateId: string
  roommateName: string
  rentShare: number
  autopayStatus: AutopayStatus
  paymentMethod: string
  lastPaymentDate: string
  autopayDayOverride?: number
}

export interface AutopayScheduleSettings {
  dueDay: number
  autopayLeadDays: number
  gracePeriodDays: number
  retryWindowDays: number
  autopayTime: string
  timezone: string
  lateFee: LateFeeRule
}

export interface AutopayScheduleConfig {
  id: string
  unitId: string
  unitLabel: string
  currency: string
  rentAmount: number
  autopayEnabled: boolean
  settings: AutopayScheduleSettings
  participants: AutopayParticipant[]
  lastRun: AutopayRunSummary
}
