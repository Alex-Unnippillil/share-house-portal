import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  Database,
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/lib/supabase'

export type TypedSupabaseClient = SupabaseClient<Database>

export type { Database, Enums, Tables, TablesInsert, TablesUpdate }

export type LeaseRow = Tables<'leases'>
export type RentInvoiceRow = Tables<'rent_invoices'>
export type RentPaymentRow = Tables<'rent_payments'>
export type PropertyRow = Tables<'properties'>
export type UnitRow = Tables<'units'>