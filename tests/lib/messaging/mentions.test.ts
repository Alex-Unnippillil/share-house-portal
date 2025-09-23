import { describe, expect, it, vi } from 'vitest'

import { insertMentionToken } from '@/lib/messaging/composer-utils'
import { getMentionSuggestions } from '@/lib/messaging/mentions'
import { segmentContentWithMentions } from '@/lib/messaging/content'
import type { MentionSuggestion, StoredMention } from '@/lib/messaging/types'

function createAsyncBuilder<T>(result: { data: T; error: { message: string } | null }) {
  const builder: any = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
  }

  builder.then = (onFulfilled: (value: typeof result) => unknown) =>
    Promise.resolve(onFulfilled(result))

  return builder
}

describe('getMentionSuggestions', () => {
  it('fetches roommate suggestions for @ triggers', async () => {
    const profiles = [
      { id: 'profile-1', full_name: 'Jordan Lee', username: 'jordan', role: 'roommate', metadata: null },
    ]
    const builder = createAsyncBuilder({ data: profiles, error: null })

    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe('profiles')
        return builder
      }),
    } as any

    const suggestions = await getMentionSuggestions(supabase, '@', 'jor')

    expect(builder.select).toHaveBeenCalledWith('id, full_name, username, role, metadata')
    expect(builder.order).toHaveBeenCalledWith('full_name', { ascending: true })
    expect(builder.or).toHaveBeenCalledWith('full_name.ilike.%jor%,username.ilike.%jor%')
    expect(suggestions).toEqual([
      {
        id: 'profile-1',
        label: 'Jordan Lee',
        description: '@jordan • roommate',
        entityType: 'profile',
        trigger: '@',
        metadata: undefined,
      },
    ])
  })

  it('combines document and amenity suggestions for # triggers', async () => {
    const documents = [
      { id: 'doc-1', title: 'Inspection checklist', document_type: 'policy', metadata: { revision: 'v2' } },
    ]
    const amenities = [
      { id: 'amenity-1', name: 'Shared workspace', slug: 'workspace', metadata: { floor: '2' } },
    ]

    const documentBuilder = createAsyncBuilder({ data: documents, error: null })
    const amenityBuilder = createAsyncBuilder({ data: amenities, error: null })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'documents') {
          return documentBuilder
        }
        if (table === 'amenities') {
          return amenityBuilder
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    } as any

    const suggestions = await getMentionSuggestions(supabase, '#', 'work')

    expect(documentBuilder.ilike).toHaveBeenCalledWith('title', '%work%')
    expect(amenityBuilder.ilike).toHaveBeenCalledWith('name', '%work%')
    expect(suggestions).toEqual([
      {
        id: 'doc-1',
        label: 'Inspection checklist',
        description: 'policy',
        entityType: 'document',
        trigger: '#',
        metadata: { revision: 'v2' },
      },
      {
        id: 'amenity-1',
        label: 'Shared workspace',
        description: 'Amenity',
        entityType: 'amenity',
        trigger: '#',
        metadata: { floor: '2', slug: 'workspace' },
      },
    ])
  })
})

describe('composer utilities', () => {
  it('inserts mention tokens and appends spacing', () => {
    const suggestion: MentionSuggestion = {
      id: 'profile-2',
      label: 'Avery Chen',
      entityType: 'profile',
      trigger: '@',
    }

    const result = insertMentionToken('Thanks @Ave', {
      trigger: '@',
      start: 7,
      end: 11,
      query: 'Ave',
    }, suggestion)

    expect(result.value).toBe('Thanks @Avery Chen ')
    expect(result.caret).toBe(result.value.length)
  })
})

describe('segmentContentWithMentions', () => {
  it('produces hyperlink segments for stored mentions', () => {
    const mentions: StoredMention[] = [
      {
        entityId: 'profile-1',
        entityType: 'profile',
        trigger: '@',
        label: 'Jordan Lee',
        order: 0,
      },
      {
        entityId: 'doc-9',
        entityType: 'document',
        trigger: '#',
        label: 'Lease agreement',
        order: 1,
      },
    ]

    const segments = segmentContentWithMentions(
      'Ping @Jordan Lee after reviewing #Lease agreement',
      mentions,
    )

    expect(segments).toEqual([
      { type: 'text', text: 'Ping ' },
      {
        type: 'mention',
        text: '@Jordan Lee',
        mention: mentions[0],
        href: '/dashboard/members/profile-1',
      },
      { type: 'text', text: ' after reviewing ' },
      {
        type: 'mention',
        text: '#Lease agreement',
        mention: mentions[1],
        href: '/documents/doc-9',
      },
    ])
  })
})
