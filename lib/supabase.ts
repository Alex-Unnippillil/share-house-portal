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
  public: {
    Tables: {
      amenities: {
        Row: {
          amenity_type: Database['public']['Enums']['amenity_type']
          building_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_reservable: boolean
          name: string
          requires_approval: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          amenity_type: Database['public']['Enums']['amenity_type']
          building_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_reservable?: boolean
          name: string
          requires_approval?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          amenity_type?: Database['public']['Enums']['amenity_type']
          building_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_reservable?: boolean
          name?: string
          requires_approval?: boolean
          slug?: string
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
          amenity_id: string
          building_id: string
          created_at: string
          ends_at: string
          id: string
          lease_id: string | null
          notes: string | null
          profile_id: string | null
          starts_at: string
          status: Database['public']['Enums']['amenity_booking_status']
          updated_at: string
        }
        Insert: {
          amenity_id: string
          building_id: string
          created_at?: string
          ends_at: string
          id?: string
          lease_id?: string | null
          notes?: string | null
          profile_id?: string | null
          starts_at: string
          status?: Database['public']['Enums']['amenity_booking_status']
          updated_at?: string
        }
        Update: {
          amenity_id?: string
          building_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          lease_id?: string | null
          notes?: string | null
          profile_id?: string | null
          starts_at?: string
          status?: Database['public']['Enums']['amenity_booking_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'amenity_bookings_amenity_id_fkey'
            columns: ['amenity_id']
            isOneToOne: false
            referencedRelation: 'amenities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'amenity_bookings_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'amenity_bookings_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'amenity_bookings_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      buildings: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          code: string
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          postal_code: string | null
          state: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code: string
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          postal_code?: string | null
          state?: string | null
          timezone: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          postal_code?: string | null
          state?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          building_id: string
          category: Database['public']['Enums']['document_category']
          created_at: string
          documenso_envelope_id: string | null
          id: string
          lease_id: string | null
          storage_path: string
          title: string
          unit_id: string | null
          updated_at: string
          uploaded_by: string | null
          visibility: Database['public']['Enums']['document_visibility']
        }
        Insert: {
          building_id: string
          category?: Database['public']['Enums']['document_category']
          created_at?: string
          documenso_envelope_id?: string | null
          id?: string
          lease_id?: string | null
          storage_path: string
          title: string
          unit_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          visibility?: Database['public']['Enums']['document_visibility']
        }
        Update: {
          building_id?: string
          category?: Database['public']['Enums']['document_category']
          created_at?: string
          documenso_envelope_id?: string | null
          id?: string
          lease_id?: string | null
          storage_path?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          visibility?: Database['public']['Enums']['document_visibility']
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
            foreignKeyName: 'documents_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documents_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documents_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      floorplan_annotations: {
        Row: {
          building_id: string
          created_at: string
          details: string | null
          floorplan_id: string
          geometry: Json
          id: string
          label: string
          profile_id: string | null
          updated_at: string
          visibility: Database['public']['Enums']['floorplan_annotation_visibility']
        }
        Insert: {
          building_id: string
          created_at?: string
          details?: string | null
          floorplan_id: string
          geometry: Json
          id?: string
          label: string
          profile_id?: string | null
          updated_at?: string
          visibility?: Database['public']['Enums']['floorplan_annotation_visibility']
        }
        Update: {
          building_id?: string
          created_at?: string
          details?: string | null
          floorplan_id?: string
          geometry?: Json
          id?: string
          label?: string
          profile_id?: string | null
          updated_at?: string
          visibility?: Database['public']['Enums']['floorplan_annotation_visibility']
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
            foreignKeyName: 'floorplan_annotations_floorplan_id_fkey'
            columns: ['floorplan_id']
            isOneToOne: false
            referencedRelation: 'floorplans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'floorplan_annotations_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      floorplans: {
        Row: {
          building_id: string
          created_at: string
          id: string
          storage_path: string
          title: string
          unit_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          storage_path: string
          title: string
          unit_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          storage_path?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
          version?: number
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
        ]
      }
      lease_residents: {
        Row: {
          building_id: string
          created_at: string
          id: number
          invited_by: string | null
          lease_id: string
          profile_id: string
          role: Database['public']['Enums']['lease_resident_role']
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: number
          invited_by?: string | null
          lease_id: string
          profile_id: string
          role?: Database['public']['Enums']['lease_resident_role']
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: number
          invited_by?: string | null
          lease_id?: string
          profile_id?: string
          role?: Database['public']['Enums']['lease_resident_role']
        }
        Relationships: [
          {
            foreignKeyName: 'lease_residents_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lease_residents_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lease_residents_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lease_residents_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      leases: {
        Row: {
          autopay_enabled: boolean
          building_id: string
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          rent_cents: number
          security_deposit_cents: number | null
          start_date: string
          status: Database['public']['Enums']['lease_status']
          unit_id: string
          updated_at: string
        }
        Insert: {
          autopay_enabled?: boolean
          building_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          rent_cents: number
          security_deposit_cents?: number | null
          start_date: string
          status?: Database['public']['Enums']['lease_status']
          unit_id: string
          updated_at?: string
        }
        Update: {
          autopay_enabled?: boolean
          building_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          rent_cents?: number
          security_deposit_cents?: number | null
          start_date?: string
          status?: Database['public']['Enums']['lease_status']
          unit_id?: string
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
            foreignKeyName: 'leases_unit_id_fkey'
            columns: ['unit_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leases_unit_building_fk'
            columns: ['unit_id', 'building_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id', 'building_id']
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_to: string | null
          building_id: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          lease_id: string | null
          priority: Database['public']['Enums']['maintenance_priority']
          reported_by: string | null
          requested_entry_at: string | null
          resolved_at: string | null
          status: Database['public']['Enums']['maintenance_status']
          summary: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          building_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lease_id?: string | null
          priority?: Database['public']['Enums']['maintenance_priority']
          reported_by?: string | null
          requested_entry_at?: string | null
          resolved_at?: string | null
          status?: Database['public']['Enums']['maintenance_status']
          summary: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          building_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lease_id?: string | null
          priority?: Database['public']['Enums']['maintenance_priority']
          reported_by?: string | null
          requested_entry_at?: string | null
          resolved_at?: string | null
          status?: Database['public']['Enums']['maintenance_status']
          summary?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_requests_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'profiles'
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
            foreignKeyName: 'maintenance_requests_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_requests_reported_by_fkey'
            columns: ['reported_by']
            isOneToOne: false
            referencedRelation: 'profiles'
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
          attachments: Json
          author_profile_id: string | null
          body: string
          building_id: string
          created_at: string
          edited_at: string | null
          id: string
          thread_id: string
          visibility: Database['public']['Enums']['document_visibility']
        }
        Insert: {
          attachments?: Json
          author_profile_id?: string | null
          body: string
          building_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          thread_id: string
          visibility?: Database['public']['Enums']['document_visibility']
        }
        Update: {
          attachments?: Json
          author_profile_id?: string | null
          body?: string
          building_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          thread_id?: string
          visibility?: Database['public']['Enums']['document_visibility']
        }
        Relationships: [
          {
            foreignKeyName: 'messages_author_profile_id_fkey'
            columns: ['author_profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_building_id_fkey'
            columns: ['building_id']
            isOneToOne: false
            referencedRelation: 'buildings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_thread_id_fkey'
            columns: ['thread_id']
            isOneToOne: false
            referencedRelation: 'threads'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          card_style: Json | null
          card_styles: string | null
          company: string | null
          company_logo_url: string | null
          created_at: string | null
          default_building_id: string | null
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          linkedin_url: string | null
          public_id: string | null
          role: string | null
          updated_at: string | null
          username: string | null
          website: string | null
          waddress: string | null
          xhandle: string | null
        }
        Insert: {
          avatar_url?: string | null
          card_style?: Json | null
          card_styles?: string | null
          company?: string | null
          company_logo_url?: string | null
          created_at?: string | null
          default_building_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          linkedin_url?: string | null
          public_id?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
          waddress?: string | null
          xhandle?: string | null
        }
        Update: {
          avatar_url?: string | null
          card_style?: Json | null
          card_styles?: string | null
          company?: string | null
          company_logo_url?: string | null
          created_at?: string | null
          default_building_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          linkedin_url?: string | null
          public_id?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
          waddress?: string | null
          xhandle?: string | null
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
          amount_cents: number
          building_id: string
          created_at: string
          due_date: string
          id: string
          lease_id: string
          memo: string | null
          paid_at: string | null
          status: Database['public']['Enums']['rent_payment_status']
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          building_id: string
          created_at?: string
          due_date: string
          id?: string
          lease_id: string
          memo?: string | null
          paid_at?: string | null
          status?: Database['public']['Enums']['rent_payment_status']
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          building_id?: string
          created_at?: string
          due_date?: string
          id?: string
          lease_id?: string
          memo?: string | null
          paid_at?: string | null
          status?: Database['public']['Enums']['rent_payment_status']
          stripe_payment_intent_id?: string | null
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
            foreignKeyName: 'rent_payments_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          },
        ]
      }
      threads: {
        Row: {
          building_id: string
          created_at: string
          created_by: string | null
          id: string
          is_archived: boolean
          is_pinned: boolean
          last_message_at: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          last_message_at?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          last_message_at?: string | null
          subject?: string
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
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      units: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          building_id: string
          created_at: string
          floor: string | null
          id: string
          is_active: boolean
          is_occupied: boolean
          rent_cents: number | null
          square_feet: number | null
          unit_number: string
          updated_at: string
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          building_id: string
          created_at?: string
          floor?: string | null
          id?: string
          is_active?: boolean
          is_occupied?: boolean
          rent_cents?: number | null
          square_feet?: number | null
          unit_number: string
          updated_at?: string
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          building_id?: string
          created_at?: string
          floor?: string | null
          id?: string
          is_active?: boolean
          is_occupied?: boolean
          rent_cents?: number | null
          square_feet?: number | null
          unit_number?: string
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
          building_id: string
          granted_at: string
          granted_by: string | null
          id: number
          role: Database['public']['Enums']['user_role']
          user_id: string
        }
        Insert: {
          building_id: string
          granted_at?: string
          granted_by?: string | null
          id?: number
          role: Database['public']['Enums']['user_role']
          user_id: string
        }
        Update: {
          building_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: number
          role?: Database['public']['Enums']['user_role']
          user_id?: string
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
            referencedRelation: 'profiles'
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
          arrival: string
          building_id: string
          created_at: string
          departure: string | null
          host_profile_id: string | null
          id: string
          lease_id: string | null
          notes: string | null
          status: Database['public']['Enums']['visitor_log_status']
          updated_at: string
          visitor_name: string
        }
        Insert: {
          arrival: string
          building_id: string
          created_at?: string
          departure?: string | null
          host_profile_id?: string | null
          id?: string
          lease_id?: string | null
          notes?: string | null
          status?: Database['public']['Enums']['visitor_log_status']
          updated_at?: string
          visitor_name: string
        }
        Update: {
          arrival?: string
          building_id?: string
          created_at?: string
          departure?: string | null
          host_profile_id?: string | null
          id?: string
          lease_id?: string | null
          notes?: string | null
          status?: Database['public']['Enums']['visitor_log_status']
          updated_at?: string
          visitor_name?: string
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
            foreignKeyName: 'visitor_logs_host_profile_id_fkey'
            columns: ['host_profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'visitor_logs_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          required_roles: Database['public']['Enums']['user_role'][]
        }
        Returns: boolean
      }
      has_building_access: {
        Args: {
          target_building: string
          allowed_roles: Database['public']['Enums']['user_role'][]
        }
        Returns: boolean
      }
      is_lease_member: {
        Args: {
          target_lease: string
        }
        Returns: boolean
      }
    }
    Enums: {
      amenity_booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
      amenity_type: 'kitchen' | 'tv_room' | 'game_room' | 'parking' | 'workspace' | 'other'
      document_category: 'lease' | 'notice' | 'invoice' | 'policy' | 'other'
      document_visibility: 'building' | 'unit' | 'lease' | 'private'
      floorplan_annotation_visibility: 'private' | 'unit' | 'building'
      lease_resident_role: 'primary' | 'roommate' | 'guarantor'
      lease_status: 'draft' | 'pending' | 'active' | 'terminated'
      maintenance_priority: 'low' | 'medium' | 'high' | 'urgent'
      maintenance_status: 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed'
      rent_payment_status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
      user_role:
        | 'platform_admin'
        | 'property_manager'
        | 'building_staff'
        | 'resident'
        | 'support_agent'
      visitor_log_status:
        | 'requested'
        | 'approved'
        | 'denied'
        | 'checked_in'
        | 'checked_out'
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
            foreignKeyName: 'objects_bucket_id_fkey'
            columns: ['bucket_id']
            isOneToOne: false
            referencedRelation: 'buckets'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: {
          bucket_id: string
          name: string
          owner: string | null
          metadata: Json
        }
        Returns: boolean
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number | null
          bucket_id: string | null
        }[]
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
          name: string | null
          id: string | null
          updated_at: string | null
          created_at: string | null
          last_accessed_at: string | null
          metadata: Json | null
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database }
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables']
  : Database['public']['Tables'][PublicTableNameOrOptions]

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database }
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][string]['Insert']
  : Database['public']['Tables'][PublicTableNameOrOptions]['Insert']

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database }
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][string]['Update']
  : Database['public']['Tables'][PublicTableNameOrOptions]['Update']

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database['public']['Enums']
    | { schema: keyof Database }
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][string]
  : Database['public']['Enums'][PublicEnumNameOrOptions]
