import type { StoredMention } from './types'

export type MentionSegment =
  | { type: 'text'; text: string }
  | { type: 'mention'; text: string; mention: StoredMention; href: string }

function resolveSlug(mention: StoredMention): string {
  const slug = mention.metadata?.slug
  if (typeof slug === 'string' && slug.length > 0) {
    return slug
  }
  return mention.entityId
}

export function resolveMentionHref(mention: StoredMention): string {
  switch (mention.entityType) {
    case 'profile':
      return `/dashboard/members/${mention.entityId}`
    case 'document':
      return `/documents/${mention.entityId}`
    case 'amenity':
      return `/bookings/amenities/${resolveSlug(mention)}`
    default:
      return '#'
  }
}

export function segmentContentWithMentions(
  content: string,
  mentions: StoredMention[],
): MentionSegment[] {
  if (mentions.length === 0) {
    return content ? [{ type: 'text', text: content }] : []
  }

  const ordered = [...mentions].sort((a, b) => a.order - b.order)
  const segments: MentionSegment[] = []
  let cursor = 0
  let searchIndex = 0

  for (const mention of ordered) {
    const token = `${mention.trigger}${mention.label}`
    const index = content.indexOf(token, searchIndex)
    if (index === -1) {
      continue
    }

    if (index > cursor) {
      segments.push({ type: 'text', text: content.slice(cursor, index) })
    }

    segments.push({
      type: 'mention',
      text: token,
      mention,
      href: resolveMentionHref(mention),
    })

    cursor = index + token.length
    searchIndex = cursor
  }

  if (cursor < content.length) {
    segments.push({ type: 'text', text: content.slice(cursor) })
  }

  return segments
}
