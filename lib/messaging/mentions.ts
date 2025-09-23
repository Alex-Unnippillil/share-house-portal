import type { PostgrestError } from '@supabase/supabase-js'

import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

import type {
  MentionQueryOptions,
  MentionSuggestion,
  MentionTrigger,
  MessageRecord,
  StoredMention,
} from './types'

const DEFAULT_SUGGESTION_LIMIT = 8

function sanitizeSearchTerm(term: string) {
  return term.replace(/[%_]/g, match => `\\${match}`)
}

function handlePostgrestError(error: PostgrestError | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`)
  }
}

type ProfileResult = {
  id: string
  full_name: string | null
  username: string | null
  role: string | null
  metadata: Record<string, unknown> | null
}

type DocumentResult = {
  id: string
  title: string
  document_type: string | null
  metadata: Record<string, unknown> | null
}

type AmenityResult = {
  id: string
  name: string
  slug: string | null
  metadata: Record<string, unknown> | null
}

export async function getMentionSuggestions(
  client: TypedSupabaseClient,
  trigger: MentionTrigger,
  term: string,
  options: MentionQueryOptions = {},
): Promise<MentionSuggestion[]> {
  const queryTerm = sanitizeSearchTerm(term.trim())
  const limit = options.limit ?? DEFAULT_SUGGESTION_LIMIT

  if (trigger === '@') {
    let query = client
      .from('profiles')
      .select('id, full_name, username, role, metadata')
      .order('full_name', { ascending: true })
      .limit(limit)

    if (options.unitId) {
      query = query.eq('unit_id', options.unitId)
    }

    if (queryTerm.length > 0) {
      query = query.or(
        `full_name.ilike.%${queryTerm}%,username.ilike.%${queryTerm}%`,
      )
    }

    const { data, error } = await query
    handlePostgrestError(error, 'Failed to load profile mentions')

    const profiles = (data ?? []) as ProfileResult[]

    return profiles.map(profile => ({
      id: profile.id,
      label: profile.full_name ?? profile.username ?? 'Roommate',
      description:
        profile.username && profile.role
          ? `@${profile.username} • ${profile.role.replace('_', ' ')}`
          : profile.username
          ? `@${profile.username}`
          : profile.role ?? undefined,
      entityType: 'profile',
      trigger: '@',
      metadata: profile.metadata ?? undefined,
    }))
  }

  const documentQuery = client
    .from('documents')
    .select('id, title, document_type, metadata')
    .order('updated_at', { ascending: false })
    .limit(limit)

  const amenityQuery = client
    .from('amenities')
    .select('id, name, slug, metadata')
    .order('name', { ascending: true })
    .limit(limit)

  const filter = queryTerm.length > 0 ? `%${queryTerm}%` : null

  const [documentsResult, amenitiesResult] = await Promise.all([
    filter
      ? documentQuery.ilike('title', filter)
      : documentQuery,
    filter
      ? amenityQuery.ilike('name', filter)
      : amenityQuery,
  ])

  handlePostgrestError(documentsResult.error, 'Failed to search documents')
  handlePostgrestError(amenitiesResult.error, 'Failed to search amenities')

  const documents = (documentsResult.data ?? []) as DocumentResult[]
  const amenities = (amenitiesResult.data ?? []) as AmenityResult[]

  const suggestions: MentionSuggestion[] = [
    ...documents.map(document => ({
      id: document.id,
      label: document.title,
      description: document.document_type ?? undefined,
      entityType: 'document',
      trigger: '#',
      metadata: document.metadata ?? undefined,
    })),
    ...amenities.map(amenity => ({
      id: amenity.id,
      label: amenity.name,
      description: 'Amenity',
      entityType: 'amenity',
      trigger: '#',
      metadata: {
        ...(amenity.metadata ?? {}),
        slug: amenity.slug ?? undefined,
      },
    })),
  ]

  return suggestions.slice(0, limit)
}

interface MentionNotificationInput {
  recipientId: string
  mention: StoredMention
  message: MessageRecord
  senderId: string
  senderDisplayName: string
  preview: string
}

export type MentionNotifier = (
  payload: MentionNotificationInput,
) => Promise<void>

function isMentionMuted(
  metadata: Record<string, unknown> | null,
  threadId: string,
): boolean {
  if (!metadata || typeof metadata !== 'object') {
    return false
  }

  const notifications = metadata.notifications
  if (notifications && typeof notifications === 'object') {
    const mentions = (notifications as Record<string, unknown>).mentions
    if (mentions && typeof mentions === 'object') {
      const mentionSettings = mentions as Record<string, unknown>
      if (mentionSettings.muted === true) {
        return true
      }
      const mutedThreads = mentionSettings.mutedThreads
      if (Array.isArray(mutedThreads) && mutedThreads.includes(threadId)) {
        return true
      }
    }
  }

  return false
}

const PREVIEW_LENGTH = 140

function buildPreview(content: string) {
  if (content.length <= PREVIEW_LENGTH) {
    return content
  }
  return `${content.slice(0, PREVIEW_LENGTH - 1)}…`
}

interface CreateMessageInput {
  threadId: string
  senderId: string
  senderDisplayName: string
  content: string
  mentions: StoredMention[]
}

export async function createMessageWithMentions(
  client: TypedSupabaseClient,
  input: CreateMessageInput,
  notifyMention?: MentionNotifier,
): Promise<MessageRecord> {
  const { data, error } = await client
    .from('messages')
    .insert({
      thread_id: input.threadId,
      sender_id: input.senderId,
      content: input.content,
      mentions: input.mentions,
    })
    .select()
    .single()

  handlePostgrestError(error, 'Failed to save message')

  const message = (data ?? null) as MessageRecord
  if (!message) {
    throw new Error('Message insert did not return a record')
  }

  if (!notifyMention) {
    return message
  }

  const profileMentions = input.mentions.filter(
    mention => mention.entityType === 'profile',
  )

  const uniqueProfiles = Array.from(
    new Set(
      profileMentions
        .map(mention => mention.entityId)
        .filter(profileId => profileId !== input.senderId),
    ),
  )

  if (uniqueProfiles.length === 0) {
    return message
  }

  const { data: profiles, error: profileError } = await client
    .from('profiles')
    .select('id, full_name, metadata')
    .in('id', uniqueProfiles)

  handlePostgrestError(profileError, 'Failed to load mention preferences')

  const preview = buildPreview(input.content)

  for (const profile of profiles ?? []) {
    const record = profile as ProfileResult
    if (isMentionMuted(record.metadata, input.threadId)) {
      continue
    }

    const mention = profileMentions.find(
      item => item.entityId === record.id,
    )

    if (!mention) {
      continue
    }

    await notifyMention({
      recipientId: record.id,
      mention,
      message,
      senderId: input.senderId,
      senderDisplayName: input.senderDisplayName,
      preview,
    })
  }

  return message
}
