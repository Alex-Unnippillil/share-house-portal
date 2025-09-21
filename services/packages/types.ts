import type { Database, Json } from '@/lib/supabase'

export type PackageRow = Database['public']['Tables']['packages']['Row']
export type PackageInsert = Database['public']['Tables']['packages']['Insert']
export type PackageUpdate = Database['public']['Tables']['packages']['Update']

export type SupplyChainRow = Database['public']['Tables']['supply_chain_data']['Row']
export type SupplyChainInsert = Database['public']['Tables']['supply_chain_data']['Insert']

export type ReminderEvent = SupplyChainRow & {
  data: {
    packageId: string
    message?: string
    recipientEmail?: string
    reminderSentAt: string
    [key: string]: Json | string | number | boolean | null | undefined
  }
}

export type IntakeEventPayload = {
  packageId: string
  recipientEmail?: string
  recipientName?: string
  intakeTimestamp: string
  metadata?: Record<string, unknown>
  createdBy: string
}

export type PickupEventPayload = {
  packageId: string
  pickedUpBy: string
  pickedUpAt: string
  signatureKey: string
  signatureUrl: string
  notes?: string
}

export type ReminderEventPayload = {
  packageId: string
  reminderSentAt: string
  message?: string
  recipientEmail?: string
}

export type PackageStatusSummary = Record<string, number>

export type DailyCount = {
  date: string
  received: number
  pickedUp: number
}

export interface PackageReporting {
  totals: PackageStatusSummary
  timeline: DailyCount[]
  reminders: number
  pickups: number
}

export interface StaffConsoleOverview {
  reporting: PackageReporting
  awaitingPickup: Array<{
    id: string
    name: string
    status: string
    created_at: string
    recipientEmail?: string
    recipientName?: string
  }>
  recentReminders: ReminderEventPayload[]
  recentPickups: PickupEventPayload[]
}

export type JsonRecord = Record<string, Json | undefined>
