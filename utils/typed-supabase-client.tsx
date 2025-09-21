import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

export type TypedSupabaseClient = SupabaseClient<Database>

export type BuildingScopedTable = {
  [K in keyof Database['public']['Tables']]: Database['public']['Tables'][K]['Row'] extends {
    building_id: string
  }
    ? K
    : never
}[keyof Database['public']['Tables']]

export type BuildingRow<TableName extends BuildingScopedTable> =
  Database['public']['Tables'][TableName]['Row']
