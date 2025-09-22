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
      chores: {
        Row: {
          id: string
          household_id: string
          title: string
          cadence: "daily" | "weekly" | "biweekly" | "monthly" | "one_time"
          points: number
          active: boolean
        }
        Insert: {
          id?: string
          household_id: string
          title: string
          cadence?: "daily" | "weekly" | "biweekly" | "monthly" | "one_time"
          points?: number
          active?: boolean
        }
        Update: {
          id?: string
          household_id?: string
          title?: string
          cadence?: "daily" | "weekly" | "biweekly" | "monthly" | "one_time"
          points?: number
          active?: boolean
        }
        Relationships: []
      }
      document_access_logs: {
        Row: {
          id: string
          created_at: string | null
          document_id: string
          user_id: string
          action: string
          ip_address: string | null
          user_agent: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          document_id: string
          user_id: string
          action: string
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          document_id?: string
          user_id?: string
          action?: string
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      document_signatures: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
          document_id: string
          signer_id: string
          signer_email: string
          signer_name: string | null
          status: "pending" | "signed" | "declined" | "expired"
          signed_at: string | null
          declined_at: string | null
          decline_reason: string | null
          documenso_signature_id: string | null
          ip_address: string | null
          user_agent: string | null
          signature_data: Json | null
          signing_order: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          document_id: string
          signer_id: string
          signer_email: string
          signer_name?: string | null
          status?: "pending" | "signed" | "declined" | "expired"
          signed_at?: string | null
          declined_at?: string | null
          decline_reason?: string | null
          documenso_signature_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          signature_data?: Json | null
          signing_order?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          document_id?: string
          signer_id?: string
          signer_email?: string
          signer_name?: string | null
          status?: "pending" | "signed" | "declined" | "expired"
          signed_at?: string | null
          declined_at?: string | null
          decline_reason?: string | null
          documenso_signature_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          signature_data?: Json | null
          signing_order?: number | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
          title: string
          description: string | null
          document_type: "lease" | "addendum" | "insurance" | "maintenance" | "other"
          status: "draft" | "pending_signature" | "signed" | "expired" | "cancelled"
          file_url: string | null
          documenso_envelope_id: string | null
          documenso_template_id: string | null
          metadata: Json | null
          created_by: string | null
          tenant_id: string | null
          unit_id: string | null
          requires_signature: boolean | null
          expires_at: string | null
          signed_at: string | null
          version: number | null
          parent_document_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          description?: string | null
          document_type: "lease" | "addendum" | "insurance" | "maintenance" | "other"
          status?: "draft" | "pending_signature" | "signed" | "expired" | "cancelled"
          file_url?: string | null
          documenso_envelope_id?: string | null
          documenso_template_id?: string | null
          metadata?: Json | null
          created_by?: string | null
          tenant_id?: string | null
          unit_id?: string | null
          requires_signature?: boolean | null
          expires_at?: string | null
          signed_at?: string | null
          version?: number | null
          parent_document_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          description?: string | null
          document_type?: "lease" | "addendum" | "insurance" | "maintenance" | "other"
          status?: "draft" | "pending_signature" | "signed" | "expired" | "cancelled"
          file_url?: string | null
          documenso_envelope_id?: string | null
          documenso_template_id?: string | null
          metadata?: Json | null
          created_by?: string | null
          tenant_id?: string | null
          unit_id?: string | null
          requires_signature?: boolean | null
          expires_at?: string | null
          signed_at?: string | null
          version?: number | null
          parent_document_id?: string | null
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          id: string
          user_id: string | null
          recipient: string
          subject: string
          template: string
          status: "sent" | "failed" | "pending"
          sent_at: string | null
          error_message: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          recipient: string
          subject: string
          template: string
          status?: "sent" | "failed" | "pending"
          sent_at?: string | null
          error_message?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string | null
          recipient?: string
          subject?: string
          template?: string
          status?: "sent" | "failed" | "pending"
          sent_at?: string | null
          error_message?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      households: {
        Row: {
          id: string
          name: string
          created_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          id: string
          name: string
          email: string
          message: string
          status: "new" | "in_progress" | "resolved" | "closed"
          created_at: string | null
          updated_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          message: string
          status?: "new" | "in_progress" | "resolved" | "closed"
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          message?: string
          status?: "new" | "in_progress" | "resolved" | "closed"
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      maintenance_requests: {
        Row: {
          id: string
          title: string
          description: string
          priority: "low" | "normal" | "high" | "urgent"
          status: "pending" | "in_progress" | "completed" | "cancelled"
          category: string | null
          location: string | null
          requested_by: string
          assigned_to: string | null
          unit_id: string | null
          created_at: string | null
          updated_at: string | null
          completed_at: string | null
          notes: string | null
          attachments: Json | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          title: string
          description: string
          priority?: "low" | "normal" | "high" | "urgent"
          status?: "pending" | "in_progress" | "completed" | "cancelled"
          category?: string | null
          location?: string | null
          requested_by: string
          assigned_to?: string | null
          unit_id?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          notes?: string | null
          attachments?: Json | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          title?: string
          description?: string
          priority?: "low" | "normal" | "high" | "urgent"
          status?: "pending" | "in_progress" | "completed" | "cancelled"
          category?: string | null
          location?: string | null
          requested_by?: string
          assigned_to?: string | null
          unit_id?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          notes?: string | null
          attachments?: Json | null
          metadata?: Json | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          id: string
          user_id: string
          start_time: string
          end_time: string
          google_event_id: string | null
          summary: string | null
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          start_time: string
          end_time: string
          google_event_id?: string | null
          summary?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_time?: string
          end_time?: string
          google_event_id?: string | null
          summary?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: "info" | "success" | "warning" | "error"
          action_url: string | null
          metadata: Json | null
          read: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: "info" | "success" | "warning" | "error"
          action_url?: string | null
          metadata?: Json | null
          read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: "info" | "success" | "warning" | "error"
          action_url?: string | null
          metadata?: Json | null
          read?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
          full_name: string | null
          username: string | null
          website: string | null
          avatar_url: string | null
          email: string | null
          role:
            | "tenant"
            | "roommate"
            | "property_manager"
            | "admin"
            | "landlord"
            | "user"
            | null
          unit_id: string | null
          phone: string | null
          language: string | null
          address: string | null
          stripe_customer_id: string | null
          metadata: Json | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          username?: string | null
          website?: string | null
          avatar_url?: string | null
          email?: string | null
          role?:
            | "tenant"
            | "roommate"
            | "property_manager"
            | "admin"
            | "landlord"
            | "user"
            | null
          unit_id?: string | null
          phone?: string | null
          language?: string | null
          address?: string | null
          stripe_customer_id?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          username?: string | null
          website?: string | null
          avatar_url?: string | null
          email?: string | null
          role?:
            | "tenant"
            | "roommate"
            | "property_manager"
            | "admin"
            | "landlord"
            | "user"
            | null
          unit_id?: string | null
          phone?: string | null
          language?: string | null
          address?: string | null
          stripe_customer_id?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      rent_payments: {
        Row: {
          id: string
          user_id: string
          stripe_payment_intent_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_charge_id: string | null
          amount: number
          currency: string
          status: string
          payment_method: string | null
          payment_method_type: string | null
          description: string | null
          receipt_url: string | null
          metadata: Json | null
          processed_at: string | null
          billing_period_start: string | null
          billing_period_end: string | null
          tenant_id: string | null
          unit_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          stripe_payment_intent_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_charge_id?: string | null
          amount: number
          currency?: string
          status?: string
          payment_method?: string | null
          payment_method_type?: string | null
          description?: string | null
          receipt_url?: string | null
          metadata?: Json | null
          processed_at?: string | null
          billing_period_start?: string | null
          billing_period_end?: string | null
          tenant_id?: string | null
          unit_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_payment_intent_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_charge_id?: string | null
          amount?: number
          currency?: string
          status?: string
          payment_method?: string | null
          payment_method_type?: string | null
          description?: string | null
          receipt_url?: string | null
          metadata?: Json | null
          processed_at?: string | null
          billing_period_start?: string | null
          billing_period_end?: string | null
          tenant_id?: string | null
          unit_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          status: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean | null
          amount: number
          currency: string
          interval: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          ended_at: string | null
          canceled_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          amount: number
          currency?: string
          interval?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          ended_at?: string | null
          canceled_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          amount?: number
          currency?: string
          interval?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          ended_at?: string | null
          canceled_at?: string | null
        }
        Relationships: []
      }
      user_tokens: {
        Row: {
          id: string
          user_id: string
          refresh_token: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          refresh_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          refresh_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      visitor_logs: {
        Row: {
          id: string
          guest_name: string
          guest_email: string
          guest_phone: string | null
          host_id: string
          check_in_date: string
          check_out_date: string
          purpose: string
          emergency_contact: string | null
          special_notes: string | null
          status: "pending" | "approved" | "rejected" | "completed"
          approved_by: string | null
          approved_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          guest_name: string
          guest_email: string
          guest_phone?: string | null
          host_id: string
          check_in_date: string
          check_out_date: string
          purpose: string
          emergency_contact?: string | null
          special_notes?: string | null
          status?: "pending" | "approved" | "rejected" | "completed"
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          guest_name?: string
          guest_email?: string
          guest_phone?: string | null
          host_id?: string
          check_in_date?: string
          check_out_date?: string
          purpose?: string
          emergency_contact?: string | null
          special_notes?: string | null
          status?: "pending" | "approved" | "rejected" | "completed"
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          id: number
          name: string
          iso2: string | null
          iso3: string | null
          phone_code: string | null
          region: string | null
        }
        Insert: {
          id?: number
          name: string
          iso2?: string | null
          iso3?: string | null
          phone_code?: string | null
          region?: string | null
        }
        Update: {
          id?: number
          name?: string
          iso2?: string | null
          iso3?: string | null
          phone_code?: string | null
          region?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_unread_notification_count: {
        Args: {
          user_uuid?: string | null
        }
        Returns: number
      }
      log_document_access: {
        Args: {
          p_document_id: string
          p_action: string
          p_metadata?: Json | null
        }
        Returns: string
      }
      mark_notifications_read: {
        Args: {
          notification_ids: string[]
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type PublicSchema = Database["public"]

export type Tables<TName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TName]["Row"]

export type TablesInsert<TName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TName]["Insert"]

export type TablesUpdate<TName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TName]["Update"]
