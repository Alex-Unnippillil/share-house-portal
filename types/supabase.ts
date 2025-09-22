import type { Json } from '@/lib/supabase'

export interface RpcAvailableAmenitySlotRow {
  slot_start: string
  slot_end: string
  is_peak: boolean
}

export interface AmenitySlot {
  start: string
  end: string
  isPeak: boolean
}

export interface RpcNextDueInvoiceCharge {
  id: string
  description: string
  category: string
  due_date: string
  original_amount: number
  outstanding_amount: number
  status: 'open' | 'partial' | 'paid' | 'waived'
}

export interface RpcNextDueInvoiceRow {
  balance_id: string
  roommate_id: string
  roommate_name: string
  unit_label: string
  currency: string
  monthly_share: number
  autopay_day: number
  autopay_status: 'active' | 'paused' | 'disabled'
  last_payment_date: string | null
  last_payment_amount: number | null
  metadata: Json | null
  outstanding_total: number
  next_charge: Json | null
  charges: Json
}

export interface NextDueInvoiceCharge {
  id: string
  description: string
  category: string
  dueDate: string
  originalAmount: number
  outstandingAmount: number
  status: 'open' | 'partial' | 'paid' | 'waived'
}

export interface NextDueInvoiceSummary {
  balanceId: string
  roommateId: string
  roommateName: string
  unitLabel: string
  currency: string
  monthlyShare: number
  autopayDay: number
  autopayStatus: 'active' | 'paused' | 'disabled'
  lastPaymentDate: string | null
  lastPaymentAmount: number | null
  outstandingTotal: number
  nextCharge: NextDueInvoiceCharge | null
  charges: NextDueInvoiceCharge[]
  metadata: Record<string, unknown> | null
}
