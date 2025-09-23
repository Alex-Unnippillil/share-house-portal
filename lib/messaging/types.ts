import type { Tables } from '@/lib/supabase'

export type MentionTrigger = '@' | '#'

export type MentionEntityType = 'profile' | 'document' | 'amenity'

export interface MentionSuggestion {
  id: string
  label: string
  description?: string
  entityType: MentionEntityType
  trigger: MentionTrigger
  metadata?: Record<string, unknown>
}

export interface StoredMention {
  entityId: string
  entityType: MentionEntityType
  trigger: MentionTrigger
  label: string
  order: number
  metadata?: Record<string, unknown>
}

export interface MentionQueryOptions {
  unitId?: string | null
  limit?: number
}

export type MessageRecord = Tables<'messages'>
