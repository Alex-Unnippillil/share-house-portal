import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

export type TypedSupabaseClient = SupabaseClient<Database>

export type SharedSpaceMapRow = Database['public']['Tables']['shared_space_maps']['Row']
export type SharedSpaceMapInsert = Database['public']['Tables']['shared_space_maps']['Insert']
export type SharedSpaceMapUpdate = Database['public']['Tables']['shared_space_maps']['Update']