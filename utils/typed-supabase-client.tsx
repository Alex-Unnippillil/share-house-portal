import { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/lib/supabase'

export type TypedSupabaseClient = SupabaseClient<Database>

export type SharedSpaceMapRow = Tables<'shared_space_maps'>
export type SharedSpaceMapInsert = TablesInsert<'shared_space_maps'>
export type SharedSpaceMapUpdate = TablesUpdate<'shared_space_maps'>