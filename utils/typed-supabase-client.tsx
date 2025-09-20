import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

export type TypedSupabaseClient = SupabaseClient<Database>
export type Amenity = Database['public']['Tables']['amenities']['Row']
export type AmenityReservation = Database['public']['Tables']['amenity_reservations']['Row']
export type AmenityReservationStatus = Database['public']['Enums']['amenity_reservation_status']

