export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Helper type for describing a Supabase table while keeping Insert/Update lightweight. */
type SupabaseTable<Row extends Record<string, unknown>> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: never[]
}

export type Database = {
  public: {
    Tables: {
      audit_logs: SupabaseTable<{
        id: string
        action: string | null
        event_type: string | null
        actor_id: string | null
        actor_role: string | null
        target_type: string | null
        target_id: string | null
        property_id: string | null
        unit_id: string | null
        thread_id: string | null
        message_id: string | null
        metadata: Json | null
        occurred_at: string | null
        created_at: string | null
      }>
      bookings: SupabaseTable<{
        id: string
        created_at: string | null
        updated_at: string | null
        property_id: string
        amenity_id: string
        amenity_name: string
        tenant_id: string | null
        status: 'pending' | 'confirmed' | 'cancelled'
        start_time: string
        end_time: string
        source: 'calcom' | 'manual'
        source_booking_id: string | null
        source_event_type_id: string | null
        source_payload: Json | null
        recurrence_rule: Json | null
        recurrence_id: string | null
        cancelled_at: string | null
        cancellation_reason: string | null
      }>
      amenity_bookings: SupabaseTable<{
        id: string
        amenity_id: string
        household_id: string | null
        created_by: string
        status: 'pending' | 'confirmed' | 'cancelled'
        start_time: string
        end_time: string
        created_at: string | null
        updated_at: string | null
        metadata: Json | null
      }>
      profiles: SupabaseTable<{
        id: string
        created_at: string | null
        updated_at: string | null
        email: string | null
        full_name: string | null
        username: string | null
        website: string | null
        avatar_url: string | null
        role: 'tenant' | 'roommate' | 'property_manager' | 'admin' | 'user' | null
        unit_id: string | null
        phone: string | null
        language: string | null
        stripe_customer_id: string | null
        rent_share: number | null
        metadata: Json | null
      }>
      documents: SupabaseTable<{
        id: string
        created_at: string | null
        updated_at: string | null
        title: string
        description: string | null
        document_type:
          | 'lease'
          | 'notice'
          | 'account_file'
          | 'addendum'
          | 'insurance'
          | 'maintenance'
          | 'other'
        status: 'draft' | 'pending_signature' | 'signed' | 'expired' | 'cancelled'
        file_url: string | null
        documenso_envelope_id: string | null
        documenso_template_id: string | null
        metadata: Json | null
        created_by: string | null
        tenant_id: string | null
        unit_id: string | null
        requires_signature: boolean
        expires_at: string | null
        signed_at: string | null
        version: number | null
        parent_document_id: string | null
      }>
      document_signatures: SupabaseTable<{
        id: string
        created_at: string | null
        updated_at: string | null
        document_id: string
        signer_id: string
        signer_email: string
        signer_name: string | null
        status: 'pending' | 'signed' | 'declined' | 'expired'
        signed_at: string | null
        declined_at: string | null
        decline_reason: string | null
        documenso_signature_id: string | null
        ip_address: string | null
        user_agent: string | null
        signature_data: Json | null
        signing_order: number | null
      }>
      document_access_logs: SupabaseTable<{
        id: string
        created_at: string | null
        document_id: string
        user_id: string
        action: string
        ip_address: string | null
        user_agent: string | null
        metadata: Json | null
      }>
      leases: SupabaseTable<{
        id: string
        document_id: string
        created_at: string | null
        updated_at: string | null
        start_date: string
        end_date: string | null
        rent_amount: number | null
        rent_frequency: string
        security_deposit: number | null
        tenant_ids: string[]
        property_address: string | null
        unit_number: string | null
        landlord_name: string | null
        landlord_email: string | null
        auto_renew: boolean | null
        renewal_notice_days: number | null
        special_terms: string | null
        status: 'active' | 'expired' | 'terminated'
      }>
      rent_payments: SupabaseTable<{
        id: string
        user_id: string
        stripe_payment_intent_id: string | null
        stripe_charge_id: string | null
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        amount: number
        currency: string
        status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'completed'
        payment_method: string | null
        payment_method_type: string | null
        description: string | null
        receipt_url: string | null
        metadata: Json | null
        payer_name: string | null
        tenant_id: string | null
        unit: string | null
        unit_id: string | null
        processed_at: string | null
        billing_period_start: string | null
        billing_period_end: string | null
        created_at: string | null
        updated_at: string | null
      }>
      webhook_events: SupabaseTable<{
        id: string
        provider: 'stripe'
        event_id: string
        event_type: string
        status: 'processing' | 'processed' | 'failed'
        payload: Json | null
        error_message: string | null
        processed_at: string | null
        created_at: string | null
        updated_at: string | null
      }>
      subscriptions: SupabaseTable<{
        id: string
        user_id: string
        stripe_subscription_id: string | null
        stripe_customer_id: string | null
        status: 'active' | 'canceled' | 'past_due' | 'unpaid'
        current_period_start: string | null
        current_period_end: string | null
        cancel_at_period_end: boolean | null
        amount: number
        currency: string
        interval: 'month' | 'year'
        metadata: Json | null
        created_at: string | null
        updated_at: string | null
      }>
      inquiries: SupabaseTable<{
        id: string
        name: string
        email: string
        message: string
        status: 'new' | 'in_progress' | 'resolved' | 'closed'
        created_at: string | null
        updated_at: string | null
        metadata: Json | null
      }>
      maintenance_requests: SupabaseTable<{
        id: string
        title: string
        description: string
        priority: 'low' | 'normal' | 'high' | 'urgent'
        severity: 'low' | 'medium' | 'high' | 'critical'
        status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
        category: string | null
        location: string | null
        property_label: string | null
        unit_label: string | null
        preferred_access_times: Json | null
        requested_by: string
        assigned_to: string | null
        unit_id: string | null
        sla_due_at: string | null
        acknowledged_at: string | null
        resolved_at: string | null
        created_at: string | null
        updated_at: string | null
        completed_at: string | null
        notes: string | null
        attachments: Json | null
        metadata: Json | null
      }>
      maintenance_request_updates: SupabaseTable<{
        id: string
        request_id: string
        event_type:
          | 'submitted'
          | 'acknowledged'
          | 'assigned'
          | 'priority_changed'
          | 'status_changed'
          | 'comment'
          | 'resolved'
          | 'reopened'
        previous_status: string | null
        next_status: string | null
        previous_priority: string | null
        next_priority: string | null
        actor_id: string | null
        assignee_id: string | null
        message: string | null
        metadata: Json | null
        created_at: string | null
      }>
      visitor_logs: SupabaseTable<{
        id: string
        guest_name: string
        guest_email: string
        guest_phone: string | null
        host_id: string
        host_roommate_id: string | null
        unit_id: string | null
        check_in_date: string
        check_out_date: string
        purpose: string
        reason: string
        emergency_contact: string | null
        special_notes: string | null
        requires_manager_approval: boolean
        approval_status: 'pending' | 'approved' | 'rejected'
        decision_notes: string | null
        policy_snapshot: Json | null
        policy_violations: Json | null
        consecutive_nights: number | null
        status: 'pending' | 'approved' | 'rejected' | 'completed'
        approved_by: string | null
        approved_at: string | null
        last_action_by: string | null
        last_action_at: string | null
        created_at: string | null
        updated_at: string | null
      }>
      visitor_unit_policies: SupabaseTable<{
        id: string
        unit_id: string
        max_consecutive_nights: number
        requires_manager_approval: boolean
        blackout_windows: Json | null
        metadata: Json | null
        created_at: string | null
        updated_at: string | null
      }>
      visitor_log_audit_entries: SupabaseTable<{
        id: string
        visitor_log_id: string
        actor_id: string | null
        action: string
        notes: string | null
        metadata: Json | null
        created_at: string | null
      }>
      notifications: SupabaseTable<{
        id: string
        user_id: string
        title: string
        message: string
        type: 'info' | 'success' | 'warning' | 'error'
        action_url: string | null
        metadata: Json | null
        read: boolean | null
        created_at: string | null
        updated_at: string | null
      }>
      email_notifications: SupabaseTable<{
        id: string
        user_id: string | null
        recipient: string
        subject: string
        template: string
        status: 'sent' | 'failed' | 'pending'
        sent_at: string | null
        error_message: string | null
        metadata: Json | null
      }>
      meetings: SupabaseTable<{
        id: string
        user_id: string
        property_id: string | null
        unit_id: string | null
        start_time: string
        end_time: string
        google_event_id: string | null
        google_event_link: string | null
        summary: string | null
        description: string | null
        metadata: Json | null
        created_at: string | null
        updated_at: string | null
      }>
      user_tokens: SupabaseTable<{
        id: string
        user_id: string
        refresh_token: string | null
        provider: string
        metadata: Json | null
        created_at: string | null
        updated_at: string | null
      }>
      chores: SupabaseTable<{
        id: string
        household_id: string
        title: string
        cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'one_time'
        points: number
        active: boolean
      }>
      households: SupabaseTable<{
        id: string
        name: string
        created_at: string | null
        updated_at: string | null
        metadata: Json | null
      }>
      floorplans: SupabaseTable<{
        id: string
        property_id: string | null
        unit_id: string | null
        storage_path: string
        original_file_name: string | null
        uploaded_by: string | null
        uploaded_at: string
        current_version: number
        metadata: Json | null
      }>
      floorplan_annotations: SupabaseTable<{
        id: string
        floorplan_id: string
        marker_type: 'room' | 'storage' | 'chore'
        label: string
        note: string | null
        x_position: number
        y_position: number
        visibility_scope: 'all_roommates' | 'selected_roommates' | 'private'
        visible_to_user_ids: string[]
        version: number
        created_by: string
        updated_by: string
        created_at: string
        updated_at: string
        archived_at: string | null
      }>
      floorplan_annotation_versions: SupabaseTable<{
        id: string
        annotation_id: string
        floorplan_id: string
        version: number
        action: 'created' | 'updated' | 'deleted' | 'rollback'
        snapshot: Json
        changed_by: string | null
        changed_at: string
      }>
      messages: SupabaseTable<{
        id: string
        thread_id: string
        author_id: string | null
        author_name: string | null
        author_role: string | null
        author_initials: string | null
        author_accent: string | null
        content: Json | null
        attachments: Json | null
        poll: Json | null
        reactions: Json | null
        created_at: string
        updated_at: string | null
      }>
      threads: SupabaseTable<{
        id: string
        title: string
        summary: string | null
        category: string
        activity: string | null
        last_message_at: string | null
        unread_count: number | null
        participants_count: number | null
        attachments_count: number | null
        reactions: Json | null
        pinned: boolean | null
        owner_name: string | null
        unit_id: string | null
        property_id: string | null
        thread_type: string | null
        scheduled_for: string | null
        announcement_visible_from: string | null
        announcement_visible_until: string | null
        locked: boolean | null
        flagged_at: string | null
        deleted_at: string | null
        created_at: string | null
        updated_at: string | null
      }>
    }
    Views: Record<string, never>
    Functions: {
      check_amenity_conflicts: {
        Args: {
          p_amenity_id: string
          p_start_time: string
          p_end_time: string
          p_household_id?: string | null
          p_booking_id?: string | null
        }
        Returns: Json
      }
      get_unread_notification_count: {
        Args: { user_uuid?: string | null }
        Returns: number
      }
      mark_notifications_read: {
        Args: { notification_ids: string[] }
        Returns: void
      }
      update_updated_at_column: {
        Args: Record<string, never>
        Returns: unknown
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
  storage: {
    Tables: {
      buckets: SupabaseTable<{
        id: string
        name: string
        owner: string | null
        created_at: string | null
        updated_at: string | null
        public: boolean | null
        avif_autodetection: boolean | null
        file_size_limit: number | null
        allowed_mime_types: string[] | null
      }>
      objects: SupabaseTable<{
        id: string
        bucket_id: string | null
        name: string | null
        owner: string | null
        created_at: string | null
        updated_at: string | null
        last_accessed_at: string | null
        metadata: Json | null
        path_tokens: string[] | null
        version: string | null
      }>
      migrations: SupabaseTable<{
        id: number
        name: string
        hash: string
        executed_at: string | null
      }>
    }
    Views: Record<string, never>
    Functions: Record<string, unknown>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']
