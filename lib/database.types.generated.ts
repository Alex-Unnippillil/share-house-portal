/* eslint-disable */
// This file is generated from Supabase migrations.
// schema-hash: 9b6911c11073f7f2eb49007e1c70c23182303c693c815a9d13061187c0547a32

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      amenities: {
        Row: { id: string; property_id: string; name: string; amenity_type: string; description: string | null; capacity: number | null; is_active: boolean; booking_window_days: number; metadata: Json; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; property_id: string; name: string; amenity_type: string; description?: string | null; capacity?: number | null; is_active?: boolean; booking_window_days?: number; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; property_id?: string; name?: string; amenity_type?: string; description?: string | null; capacity?: number | null; is_active?: boolean; booking_window_days?: number; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      audit_logs: {
        Row: { id: string; property_id: string | null; unit_id: string | null; actor_id: string | null; entity_type: string; entity_id: string | null; action: string; old_values: Json | null; new_values: Json | null; metadata: Json; created_at: string }
        Insert: { id?: string; property_id?: string | null; unit_id?: string | null; actor_id?: string | null; entity_type: string; entity_id?: string | null; action: string; old_values?: Json | null; new_values?: Json | null; metadata?: Json; created_at?: string }
        Update: { id?: string; property_id?: string | null; unit_id?: string | null; actor_id?: string | null; entity_type?: string; entity_id?: string | null; action?: string; old_values?: Json | null; new_values?: Json | null; metadata?: Json; created_at?: string }
        Relationships: never[]
      }
      auth_security_events: {
        Row: { id: string; user_id: string | null; event_type: string; status: 'success' | 'failed'; ip_address: string | null; user_agent: string | null; context: Json; created_at: string }
        Insert: { id?: string; user_id?: string | null; event_type: string; status?: 'success' | 'failed'; ip_address?: string | null; user_agent?: string | null; context?: Json; created_at?: string }
        Update: { id?: string; user_id?: string | null; event_type?: string; status?: 'success' | 'failed'; ip_address?: string | null; user_agent?: string | null; context?: Json; created_at?: string }
        Relationships: never[]
      }
      bookings: {
        Row: { id: string; property_id: string; amenity_id: string; unit_id: string | null; booked_by: string; amenity_name: string | null; tenant_id: string | null; status: Database['public']['Enums']['booking_status']; start_time: string; end_time: string; notes: string | null; source: 'calcom' | 'manual'; source_booking_id: string | null; source_event_type_id: string | null; source_payload: Json | null; recurrence_rule: Json | null; recurrence_id: string | null; cancelled_at: string | null; cancellation_reason: string | null; metadata: Json; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; property_id: string; amenity_id: string; unit_id?: string | null; booked_by: string; amenity_name?: string | null; tenant_id?: string | null; status?: Database['public']['Enums']['booking_status']; start_time: string; end_time: string; notes?: string | null; source?: 'calcom' | 'manual'; source_booking_id?: string | null; source_event_type_id?: string | null; source_payload?: Json | null; recurrence_rule?: Json | null; recurrence_id?: string | null; cancelled_at?: string | null; cancellation_reason?: string | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; property_id?: string; amenity_id?: string; unit_id?: string | null; booked_by?: string; amenity_name?: string | null; tenant_id?: string | null; status?: Database['public']['Enums']['booking_status']; start_time?: string; end_time?: string; notes?: string | null; source?: 'calcom' | 'manual'; source_booking_id?: string | null; source_event_type_id?: string | null; source_payload?: Json | null; recurrence_rule?: Json | null; recurrence_id?: string | null; cancelled_at?: string | null; cancellation_reason?: string | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      data_integrity_findings: {
        Row: { id: string; finding_type: string; severity: 'warning' | 'critical'; finding_key: string; details: Json; detected_at: string; resolved_at: string | null }
        Insert: { id?: string; finding_type: string; severity?: 'warning' | 'critical'; finding_key: string; details?: Json; detected_at?: string; resolved_at?: string | null }
        Update: { id?: string; finding_type?: string; severity?: 'warning' | 'critical'; finding_key?: string; details?: Json; detected_at?: string; resolved_at?: string | null }
        Relationships: never[]
      }
      documents: {
        Row: { id: string; property_id: string | null; unit_id: string | null; tenant_id: string | null; title: string; document_type: string; status: Database['public']['Enums']['document_status']; file_url: string | null; documenso_envelope_id: string | null; metadata: Json; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; property_id?: string | null; unit_id?: string | null; tenant_id?: string | null; title: string; document_type: string; status?: Database['public']['Enums']['document_status']; file_url?: string | null; documenso_envelope_id?: string | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; property_id?: string | null; unit_id?: string | null; tenant_id?: string | null; title?: string; document_type?: string; status?: Database['public']['Enums']['document_status']; file_url?: string | null; documenso_envelope_id?: string | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      floorplan_annotations: {
        Row: { id: string; floorplan_id: string; profile_id: string | null; annotation_key: string; annotation_value: Json; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; floorplan_id: string; profile_id?: string | null; annotation_key: string; annotation_value: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; floorplan_id?: string; profile_id?: string | null; annotation_key?: string; annotation_value?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      floorplans: {
        Row: { id: string; property_id: string; unit_id: string | null; name: string; svg_url: string; version: number; metadata: Json; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; property_id: string; unit_id?: string | null; name: string; svg_url: string; version?: number; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; property_id?: string; unit_id?: string | null; name?: string; svg_url?: string; version?: number; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      leases: {
        Row: { id: string; property_id: string; unit_id: string; tenant_id: string; document_id: string | null; start_date: string; end_date: string; rent_amount: number; deposit_amount: number | null; status: Database['public']['Enums']['lease_status']; metadata: Json; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; property_id: string; unit_id: string; tenant_id: string; document_id?: string | null; start_date: string; end_date: string; rent_amount: number; deposit_amount?: number | null; status?: Database['public']['Enums']['lease_status']; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; property_id?: string; unit_id?: string; tenant_id?: string; document_id?: string | null; start_date?: string; end_date?: string; rent_amount?: number; deposit_amount?: number | null; status?: Database['public']['Enums']['lease_status']; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      maintenance_requests: {
        Row: { id: string; property_id: string; unit_id: string | null; requester_id: string; assignee_id: string | null; title: string; description: string | null; priority: 'low' | 'medium' | 'high' | 'urgent'; status: Database['public']['Enums']['maintenance_status']; requested_for: string | null; resolved_at: string | null; metadata: Json; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; property_id: string; unit_id?: string | null; requester_id: string; assignee_id?: string | null; title: string; description?: string | null; priority?: 'low' | 'medium' | 'high' | 'urgent'; status?: Database['public']['Enums']['maintenance_status']; requested_for?: string | null; resolved_at?: string | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; property_id?: string; unit_id?: string | null; requester_id?: string; assignee_id?: string | null; title?: string; description?: string | null; priority?: 'low' | 'medium' | 'high' | 'urgent'; status?: Database['public']['Enums']['maintenance_status']; requested_for?: string | null; resolved_at?: string | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      manager_unit_assignments: {
        Row: { id: string; manager_id: string; unit_id: string; created_at: string }
        Insert: { id?: string; manager_id: string; unit_id: string; created_at?: string }
        Update: { id?: string; manager_id?: string; unit_id?: string; created_at?: string }
        Relationships: never[]
      }
      meetings: {
        Row: { id: string; user_id: string; property_id: string | null; unit_id: string | null; start_time: string; end_time: string; google_event_id: string | null; google_event_link: string | null; summary: string | null; description: string | null; metadata: Json; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; property_id?: string | null; unit_id?: string | null; start_time: string; end_time: string; google_event_id?: string | null; google_event_link?: string | null; summary?: string | null; description?: string | null; metadata?: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; property_id?: string | null; unit_id?: string | null; start_time?: string; end_time?: string; google_event_id?: string | null; google_event_link?: string | null; summary?: string | null; description?: string | null; metadata?: Json; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      messages: {
        Row: { id: string; property_id: string; unit_id: string | null; thread_id: string; author_id: string; body: string; status: Database['public']['Enums']['message_status']; edited_at: string | null; metadata: Json; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; property_id: string; unit_id?: string | null; thread_id: string; author_id: string; body: string; status?: Database['public']['Enums']['message_status']; edited_at?: string | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; property_id?: string; unit_id?: string | null; thread_id?: string; author_id?: string; body?: string; status?: Database['public']['Enums']['message_status']; edited_at?: string | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      profiles: {
        Row: { id: string; property_id: string | null; unit_id: string | null; role: Database['public']['Enums']['profile_role']; email: string | null; full_name: string | null; avatar_url: string | null; phone: string | null; emergency_contact: Json | null; vehicle_info: Json | null; is_active: boolean; created_by: string | null; created_at: string; updated_at: string; username: string | null; website: string | null; email_verified_at: string | null; last_sign_in_at: string | null; onboarding_completed: boolean }
        Insert: { id: string; property_id?: string | null; unit_id?: string | null; role?: Database['public']['Enums']['profile_role']; email?: string | null; full_name?: string | null; avatar_url?: string | null; phone?: string | null; emergency_contact?: Json | null; vehicle_info?: Json | null; is_active?: boolean; created_by?: string | null; created_at?: string; updated_at?: string; username?: string | null; website?: string | null; email_verified_at?: string | null; last_sign_in_at?: string | null; onboarding_completed?: boolean }
        Update: { id?: string; property_id?: string | null; unit_id?: string | null; role?: Database['public']['Enums']['profile_role']; email?: string | null; full_name?: string | null; avatar_url?: string | null; phone?: string | null; emergency_contact?: Json | null; vehicle_info?: Json | null; is_active?: boolean; created_by?: string | null; created_at?: string; updated_at?: string; username?: string | null; website?: string | null; email_verified_at?: string | null; last_sign_in_at?: string | null; onboarding_completed?: boolean }
        Relationships: never[]
      }
      properties: {
        Row: { id: string; name: string; slug: string; address_line_1: string | null; address_line_2: string | null; city: string | null; state: string | null; postal_code: string | null; country: string | null; timezone: string | null; manager_id: string | null; metadata: Json; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; slug: string; address_line_1?: string | null; address_line_2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null; timezone?: string | null; manager_id?: string | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; slug?: string; address_line_1?: string | null; address_line_2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null; timezone?: string | null; manager_id?: string | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      rent_payments: {
        Row: { id: string; property_id: string | null; unit_id: string | null; lease_id: string | null; tenant_id: string | null; stripe_payment_intent_id: string | null; stripe_customer_id: string | null; amount: number; currency: string; due_date: string | null; paid_at: string | null; status: Database['public']['Enums']['payment_status']; metadata: Json; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; property_id?: string | null; unit_id?: string | null; lease_id?: string | null; tenant_id?: string | null; stripe_payment_intent_id?: string | null; stripe_customer_id?: string | null; amount: number; currency?: string; due_date?: string | null; paid_at?: string | null; status?: Database['public']['Enums']['payment_status']; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; property_id?: string | null; unit_id?: string | null; lease_id?: string | null; tenant_id?: string | null; stripe_payment_intent_id?: string | null; stripe_customer_id?: string | null; amount?: number; currency?: string; due_date?: string | null; paid_at?: string | null; status?: Database['public']['Enums']['payment_status']; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      threads: {
        Row: { id: string; property_id: string; unit_id: string | null; author_id: string; title: string; body: string | null; status: Database['public']['Enums']['thread_status']; is_pinned: boolean; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; property_id: string; unit_id?: string | null; author_id: string; title: string; body?: string | null; status?: Database['public']['Enums']['thread_status']; is_pinned?: boolean; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; property_id?: string; unit_id?: string | null; author_id?: string; title?: string; body?: string | null; status?: Database['public']['Enums']['thread_status']; is_pinned?: boolean; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      units: {
        Row: { id: string; property_id: string; unit_number: string; floor_label: string | null; bedrooms: number | null; bathrooms: number | null; monthly_rent: number | null; occupancy_limit: number | null; metadata: Json; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; property_id: string; unit_number: string; floor_label?: string | null; bedrooms?: number | null; bathrooms?: number | null; monthly_rent?: number | null; occupancy_limit?: number | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; property_id?: string; unit_number?: string; floor_label?: string | null; bedrooms?: number | null; bathrooms?: number | null; monthly_rent?: number | null; occupancy_limit?: number | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      user_preferences: {
        Row: { id: string; user_id: string; communication_channel: 'in_app' | 'sms' | 'email' | 'all'; quiet_hours_start: string | null; quiet_hours_end: string | null; timezone: string; email_receipt_opt_in: boolean; booking_reminder_opt_in: boolean; marketing_opt_in: boolean; metadata: Json; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; communication_channel?: 'in_app' | 'sms' | 'email' | 'all'; quiet_hours_start?: string | null; quiet_hours_end?: string | null; timezone?: string; email_receipt_opt_in?: boolean; booking_reminder_opt_in?: boolean; marketing_opt_in?: boolean; metadata?: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; communication_channel?: 'in_app' | 'sms' | 'email' | 'all'; quiet_hours_start?: string | null; quiet_hours_end?: string | null; timezone?: string; email_receipt_opt_in?: boolean; booking_reminder_opt_in?: boolean; marketing_opt_in?: boolean; metadata?: Json; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      user_tokens: {
        Row: { id: string; user_id: string; refresh_token: string | null; provider: string; metadata: Json; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; refresh_token?: string | null; provider?: string; metadata?: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; refresh_token?: string | null; provider?: string; metadata?: Json; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
      visitor_logs: {
        Row: { id: string; property_id: string; unit_id: string; host_id: string; guest_name: string; reason: string | null; arrival_date: string; departure_date: string; status: Database['public']['Enums']['visitor_log_status']; approved_by: string | null; metadata: Json; created_by: string | null; created_at: string; updated_at: string; guest_email: string | null; guest_phone: string | null; host_roommate_id: string | null; check_in_date: string | null; check_out_date: string | null; purpose: string | null; emergency_contact: string | null; special_notes: string | null; requires_manager_approval: boolean; approval_status: 'pending' | 'approved' | 'rejected'; decision_notes: string | null; policy_snapshot: Json | null; policy_violations: Json | null; consecutive_nights: number | null; last_action_by: string | null; last_action_at: string | null }
        Insert: { id?: string; property_id: string; unit_id: string; host_id: string; guest_name: string; reason?: string | null; arrival_date: string; departure_date: string; status?: Database['public']['Enums']['visitor_log_status']; approved_by?: string | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string; guest_email?: string | null; guest_phone?: string | null; host_roommate_id?: string | null; check_in_date?: string | null; check_out_date?: string | null; purpose?: string | null; emergency_contact?: string | null; special_notes?: string | null; requires_manager_approval?: boolean; approval_status?: 'pending' | 'approved' | 'rejected'; decision_notes?: string | null; policy_snapshot?: Json | null; policy_violations?: Json | null; consecutive_nights?: number | null; last_action_by?: string | null; last_action_at?: string | null }
        Update: { id?: string; property_id?: string; unit_id?: string; host_id?: string; guest_name?: string; reason?: string | null; arrival_date?: string; departure_date?: string; status?: Database['public']['Enums']['visitor_log_status']; approved_by?: string | null; metadata?: Json; created_by?: string | null; created_at?: string; updated_at?: string; guest_email?: string | null; guest_phone?: string | null; host_roommate_id?: string | null; check_in_date?: string | null; check_out_date?: string | null; purpose?: string | null; emergency_contact?: string | null; special_notes?: string | null; requires_manager_approval?: boolean; approval_status?: 'pending' | 'approved' | 'rejected'; decision_notes?: string | null; policy_snapshot?: Json | null; policy_violations?: Json | null; consecutive_nights?: number | null; last_action_by?: string | null; last_action_at?: string | null }
        Relationships: never[]
      }
      webhook_events: {
        Row: { id: string; provider: 'stripe'; event_id: string; event_type: string; status: 'processing' | 'processed' | 'failed' | 'dead_lettered'; payload: Json | null; error_message: string | null; retry_count: number; max_retries: number; next_retry_at: string | null; last_attempt_at: string | null; dead_lettered_at: string | null; processed_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; provider: 'stripe'; event_id: string; event_type: string; status?: 'processing' | 'processed' | 'failed' | 'dead_lettered'; payload?: Json | null; error_message?: string | null; retry_count?: number; max_retries?: number; next_retry_at?: string | null; last_attempt_at?: string | null; dead_lettered_at?: string | null; processed_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; provider?: 'stripe'; event_id?: string; event_type?: string; status?: 'processing' | 'processed' | 'failed' | 'dead_lettered'; payload?: Json | null; error_message?: string | null; retry_count?: number; max_retries?: number; next_retry_at?: string | null; last_attempt_at?: string | null; dead_lettered_at?: string | null; processed_at?: string | null; created_at?: string; updated_at?: string }
        Relationships: never[]
      }
    }
    Views: {
      amenity_bookings: {
        Row: { id: string | null; amenity_id: string | null; household_id: string | null; created_by: string | null; status: Database['public']['Enums']['booking_status'] | null; start_time: string | null; end_time: string | null; created_at: string | null; updated_at: string | null; metadata: Json | null }
      }
    }
    Functions: {
      can_access_unit: { Args: { target_unit_id: string }; Returns: boolean }
      check_amenity_conflicts: { Args: { p_amenity_id: string; p_start_time: string; p_end_time: string; p_household_id?: string | null; p_booking_id?: string | null }; Returns: Json }
      current_user_role: { Args: Record<string, never>; Returns: string }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      update_updated_at_column: { Args: Record<string, never>; Returns: unknown }
    }
    Enums: {
      booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
      document_status: 'draft' | 'pending_signature' | 'signed' | 'expired' | 'cancelled'
      lease_status: 'draft' | 'active' | 'expired' | 'terminated'
      maintenance_status: 'open' | 'in_progress' | 'blocked' | 'resolved' | 'cancelled'
      message_status: 'active' | 'edited' | 'deleted' | 'flagged'
      payment_status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded'
      profile_role: 'tenant' | 'roommate' | 'property_manager' | 'admin'
      thread_status: 'active' | 'locked' | 'archived'
      visitor_log_status: 'requested' | 'approved' | 'denied' | 'checked_in' | 'checked_out' | 'cancelled'
    }
    CompositeTypes: Record<string, never>
  }
}

export type PublicSchema = Database['public']
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
