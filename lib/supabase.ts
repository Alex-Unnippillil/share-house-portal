export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  next_auth: {
    Tables: {
      accounts: {
        Row: {
          access_token: string | null
          expires_at: number | null
          id: string
          id_token: string | null
          oauth_token: string | null
          oauth_token_secret: string | null
          provider: string
          providerAccountId: string
          refresh_token: string | null
          scope: string | null
          session_state: string | null
          token_type: string | null
          type: string
          userId: string | null
        }
        Insert: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          oauth_token?: string | null
          oauth_token_secret?: string | null
          provider: string
          providerAccountId: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type: string
          userId?: string | null
        }
        Update: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          oauth_token?: string | null
          oauth_token_secret?: string | null
          provider?: string
          providerAccountId?: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          expires: string
          id: string
          sessionToken: string
          userId: string | null
        }
        Insert: {
          expires: string
          id?: string
          sessionToken: string
          userId?: string | null
        }
        Update: {
          expires?: string
          id?: string
          sessionToken?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          email: string | null
          emailVerified: string | null
          id: string
          image: string | null
          name: string | null
        }
        Insert: {
          email?: string | null
          emailVerified?: string | null
          id?: string
          image?: string | null
          name?: string | null
        }
        Update: {
          email?: string | null
          emailVerified?: string | null
          id?: string
          image?: string | null
          name?: string | null
        }
        Relationships: []
      }
      verification_tokens: {
        Row: {
          expires: string
          identifier: string | null
          token: string
        }
        Insert: {
          expires: string
          identifier?: string | null
          token: string
        }
        Update: {
          expires?: string
          identifier?: string | null
          token?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      amenities: {
        Row: {
          id: string
          building_id: string
          slug: string
          name: string
          description: string | null
          location: string | null
          is_bookable: boolean
          calcom_event_type_id: string | null
          open_time: string | null
          close_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id: string
          slug: string
          name: string
          description?: string | null
          location?: string | null
          is_bookable?: boolean
          calcom_event_type_id?: string | null
          open_time?: string | null
          close_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          slug?: string
          name?: string
          description?: string | null
          location?: string | null
          is_bookable?: boolean
          calcom_event_type_id?: string | null
          open_time?: string | null
          close_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'amenities_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
        ]
      }
      amenity_bookings: {
        Row: {
          id: string
          building_id: string
          amenity_id: string
          lease_id: string | null
          booked_by: string
          status: Database['public']['Enums']['booking_status']
          starts_at: string
          ends_at: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id: string
          amenity_id: string
          lease_id?: string | null
          booked_by: string
          status?: Database['public']['Enums']['booking_status']
          starts_at: string
          ends_at: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          amenity_id?: string
          lease_id?: string | null
          booked_by?: string
          status?: Database['public']['Enums']['booking_status']
          starts_at?: string
          ends_at?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'amenity_bookings_amenity_fk'
            columns: ['building_id', 'amenity_id']
            isOneToOne: false
            referencedRelation: 'amenities'
            referencedColumns: ['building_id', 'id']
          },
          {
            foreignKeyName: 'amenity_bookings_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'amenity_bookings_lease_fk'
            columns: ['building_id', 'lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['building_id', 'id']
          },
          {
            foreignKeyName: 'amenity_bookings_booked_by_fkey'
            columns: ['booked_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      buildings: {
        Row: {
          id: string
          name: string
          code: string
          address_line1: string
          address_line2: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string | null
          timezone: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          address_line1: string
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          timezone?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          address_line1?: string
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          timezone?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          building_id: string
          lease_id: string | null
          uploaded_by: string
          category: Database['public']['Enums']['document_category']
          title: string
          storage_path: string
          version: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          building_id: string
          lease_id?: string | null
          uploaded_by: string
          category?: Database['public']['Enums']['document_category']
          title: string
          storage_path: string
          version?: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          lease_id?: string | null
          uploaded_by?: string
          category?: Database['public']['Enums']['document_category']
          title?: string
          storage_path?: string
          version?: number
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'documents_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documents_lease_fk'
            columns: ['building_id', 'lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['building_id', 'id']
          },
          {
            foreignKeyName: 'documents_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      floorplan_annotations: {
        Row: {
          id: string
          building_id: string
          floorplan_id: string
          created_by: string
          label: string
          payload: Json
          visibility: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id: string
          floorplan_id: string
          created_by: string
          label: string
          payload: Json
          visibility?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          floorplan_id?: string
          created_by?: string
          label?: string
          payload?: Json
          visibility?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'floorplan_annotations_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'floorplan_annotations_floorplan_fk'
            columns: ['building_id', 'floorplan_id']
            isOneToOne: false
            referencedRelation: 'floorplans'
            referencedColumns: ['building_id', 'id']
          },
          {
            foreignKeyName: 'floorplan_annotations_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      floorplans: {
        Row: {
          id: string
          building_id: string
          unit_id: string | null
          name: string
          storage_path: string
          version: number
          uploaded_by: string | null
          uploaded_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          building_id: string
          unit_id?: string | null
          name: string
          storage_path: string
          version?: number
          uploaded_by?: string | null
          uploaded_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          building_id?: string
          unit_id?: string | null
          name?: string
          storage_path?: string
          version?: number
          uploaded_by?: string | null
          uploaded_at?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'floorplans_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'floorplans_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'floorplans_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      lease_tenants: {
        Row: {
          id: number
          building_id: string
          lease_id: string
          tenant_id: string
          rent_share: number | null
          joined_at: string
        }
        Insert: {
          id?: number
          building_id: string
          lease_id: string
          tenant_id: string
          rent_share?: number | null
          joined_at?: string
        }
        Update: {
          id?: number
          building_id?: string
          lease_id?: string
          tenant_id?: string
          rent_share?: number | null
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lease_tenants_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lease_tenants_lease_fk'
            columns: ['building_id', 'lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['building_id', 'id']
          },
          {
            foreignKeyName: 'lease_tenants_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      leases: {
        Row: {
          id: string
          building_id: string
          unit_id: string
          primary_tenant_id: string
          status: Database['public']['Enums']['lease_status']
          start_date: string
          end_date: string | null
          rent_amount: number
          security_deposit: number | null
          billing_cycle_day: number
          stripe_customer_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id: string
          unit_id: string
          primary_tenant_id: string
          status?: Database['public']['Enums']['lease_status']
          start_date: string
          end_date?: string | null
          rent_amount: number
          security_deposit?: number | null
          billing_cycle_day?: number
          stripe_customer_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          unit_id?: string
          primary_tenant_id?: string
          status?: Database['public']['Enums']['lease_status']
          start_date?: string
          end_date?: string | null
          rent_amount?: number
          security_deposit?: number | null
          billing_cycle_day?: number
          stripe_customer_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leases_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leases_primary_tenant_id_fkey'
            columns: ['primary_tenant_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leases_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_requests: {
        Row: {
          id: string
          building_id: string
          unit_id: string
          lease_id: string | null
          reported_by: string
          assigned_to: string | null
          status: Database['public']['Enums']['maintenance_status']
          priority: Database['public']['Enums']['maintenance_priority']
          category: string | null
          summary: string
          description: string | null
          metadata: Json
          requested_at: string
          resolved_at: string | null
          closed_at: string | null
        }
        Insert: {
          id?: string
          building_id: string
          unit_id: string
          lease_id?: string | null
          reported_by: string
          assigned_to?: string | null
          status?: Database['public']['Enums']['maintenance_status']
          priority?: Database['public']['Enums']['maintenance_priority']
          category?: string | null
          summary: string
          description?: string | null
          metadata?: Json
          requested_at?: string
          resolved_at?: string | null
          closed_at?: string | null
        }
        Update: {
          id?: string
          building_id?: string
          unit_id?: string
          lease_id?: string | null
          reported_by?: string
          assigned_to?: string | null
          status?: Database['public']['Enums']['maintenance_status']
          priority?: Database['public']['Enums']['maintenance_priority']
          category?: string | null
          summary?: string
          description?: string | null
          metadata?: Json
          requested_at?: string
          resolved_at?: string | null
          closed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_requests_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_requests_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_requests_lease_fk'
            columns: ['building_id', 'lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['building_id', 'id']
          },
          {
            foreignKeyName: 'maintenance_requests_reported_by_fkey'
            columns: ['reported_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_requests_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          id: string
          building_id: string
          thread_id: string
          sender_id: string
          body: string
          attachments: Json
          is_system: boolean
          reply_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id: string
          thread_id: string
          sender_id: string
          body: string
          attachments?: Json
          is_system?: boolean
          reply_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          thread_id?: string
          sender_id?: string
          body?: string
          attachments?: Json
          is_system?: boolean
          reply_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_reply_to_fkey'
            columns: ['reply_to']
            isOneToOne: false
            referencedRelation: 'messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_thread_fk'
            columns: ['building_id', 'thread_id']
            isOneToOne: false
            referencedRelation: 'threads'
            referencedColumns: ['building_id', 'id']
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          full_name: string | null
          phone_number: string | null
          avatar_url: string | null
          default_building_id: string | null
          onboarding_completed_at: string | null
          preferences: Json
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          phone_number?: string | null
          avatar_url?: string | null
          default_building_id?: string | null
          onboarding_completed_at?: string | null
          preferences?: Json
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          phone_number?: string | null
          avatar_url?: string | null
          default_building_id?: string | null
          onboarding_completed_at?: string | null
          preferences?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_default_building_id_fkey'
            columns: ['default_building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      rent_payments: {
        Row: {
          id: string
          building_id: string
          lease_id: string
          amount: number
          due_date: string
          paid_at: string | null
          status: Database['public']['Enums']['payment_status']
          stripe_payment_intent_id: string | null
          memo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id: string
          lease_id: string
          amount: number
          due_date: string
          paid_at?: string | null
          status?: Database['public']['Enums']['payment_status']
          stripe_payment_intent_id?: string | null
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          lease_id?: string
          amount?: number
          due_date?: string
          paid_at?: string | null
          status?: Database['public']['Enums']['payment_status']
          stripe_payment_intent_id?: string | null
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rent_payments_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rent_payments_lease_fk'
            columns: ['building_id', 'lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['building_id', 'id']
          },
        ]
      }
      threads: {
        Row: {
          id: string
          building_id: string
          subject: string
          created_by: string
          status: Database['public']['Enums']['thread_status']
          is_private: boolean
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id: string
          subject: string
          created_by: string
          status?: Database['public']['Enums']['thread_status']
          is_private?: boolean
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          subject?: string
          created_by?: string
          status?: Database['public']['Enums']['thread_status']
          is_private?: boolean
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'threads_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'threads_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      units: {
        Row: {
          id: string
          building_id: string
          unit_number: string
          floor: number | null
          bedrooms: number | null
          bathrooms: number | null
          square_feet: number | null
          rent_amount: number | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id: string
          unit_number: string
          floor?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          square_feet?: number | null
          rent_amount?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          unit_number?: string
          floor?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          square_feet?: number | null
          rent_amount?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'units_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
        ]
      }
      user_roles: {
        Row: {
          id: number
          user_id: string
          building_id: string
          role: Database['public']['Enums']['user_role_type']
          granted_by: string | null
          granted_at: string
        }
        Insert: {
          id?: number
          user_id: string
          building_id: string
          role: Database['public']['Enums']['user_role_type']
          granted_by?: string | null
          granted_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          building_id?: string
          role?: Database['public']['Enums']['user_role_type']
          granted_by?: string | null
          granted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_roles_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_roles_granted_by_fkey'
            columns: ['granted_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_roles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      visitor_logs: {
        Row: {
          id: string
          building_id: string
          lease_id: string
          host_user_id: string
          visitor_name: string
          status: Database['public']['Enums']['visitor_status']
          arrival_at: string
          departure_at: string | null
          purpose: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id: string
          lease_id: string
          host_user_id: string
          visitor_name: string
          status?: Database['public']['Enums']['visitor_status']
          arrival_at: string
          departure_at?: string | null
          purpose?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          lease_id?: string
          host_user_id?: string
          visitor_name?: string
          status?: Database['public']['Enums']['visitor_status']
          arrival_at?: string
          departure_at?: string | null
          purpose?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'visitor_logs_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'visitor_logs_lease_fk'
            columns: ['building_id', 'lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['building_id', 'id']
          },
          {
            foreignKeyName: 'visitor_logs_host_user_id_fkey'
            columns: ['host_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_building_role: {
        Args: {
          target_building: string
          allowed_roles?: Database['public']['Enums']['user_role_type'][] | null
        }
        Returns: boolean
      }
      has_shared_building: {
        Args: {
          target_user: string
          allowed_roles?: Database['public']['Enums']['user_role_type'][] | null
        }
        Returns: boolean
      }
    }
    Enums: {
      booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
      document_category: 'lease' | 'payment' | 'notice' | 'policy' | 'other'
      lease_status: 'draft' | 'pending' | 'active' | 'terminated' | 'expired'
      maintenance_priority: 'low' | 'medium' | 'high' | 'urgent'
      maintenance_status: 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed'
      payment_status: 'scheduled' | 'processing' | 'paid' | 'failed' | 'refunded'
      thread_status: 'open' | 'locked' | 'archived'
      user_role_type:
        | 'platform_admin'
        | 'property_manager'
        | 'building_staff'
        | 'resident'
        | 'support_agent'
      visitor_status: 'registered' | 'checked_in' | 'checked_out' | 'denied'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          bucket_id: string
          created_at: string | null
          definition: string
          id: number
          name: string
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          definition: string
          id?: never
          name: string
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          definition?: string
          id?: never
          name?: string
        }
        Relationships: []
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: { bucketid: string; name: string; owner: string; metadata: Json }
        Returns: undefined
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  next_auth: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      document_category: ["lease", "payment", "notice", "policy", "other"],
      lease_status: ["draft", "pending", "active", "terminated", "expired"],
      maintenance_priority: ["low", "medium", "high", "urgent"],
      maintenance_status: ["open", "in_progress", "on_hold", "resolved", "closed"],
      payment_status: ["scheduled", "processing", "paid", "failed", "refunded"],
      thread_status: ["open", "locked", "archived"],
      user_role_type: [
        "platform_admin",
        "property_manager",
        "building_staff",
        "resident",
        "support_agent",
      ],
      visitor_status: ["registered", "checked_in", "checked_out", "denied"],
    },
  },
  storage: {
    Enums: {},
  },
} as const
