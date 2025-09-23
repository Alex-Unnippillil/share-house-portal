import { Fragment, useMemo } from 'react'

import {
  segmentContentWithMentions,
  type MentionSegment,
} from '@/lib/messaging/content'
import type { StoredMention } from '@/lib/messaging/types'

interface MessageContentProps {
  content: string
  mentions: StoredMention[]
  className?: string
}

function renderText(text: string, key: string) {
  const parts = text.split(/(\n)/)
  return parts.map((part, index) => {
    if (part === '\n') {
      return <br key={`${key}-break-${index}`} />
    }
    return <Fragment key={`${key}-text-${index}`}>{part}</Fragment>
  })
}

export function MessageContent({ content, mentions, className }: MessageContentProps) {
  const segments = useMemo<MentionSegment[]>(
    () => segmentContentWithMentions(content, mentions),
    [content, mentions],
  )

  if (segments.length === 0) {
    return null
  }

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return renderText(segment.text, `segment-${index}`)
        }

        const { mention } = segment
        return (
          <a
            key={`mention-${mention.entityType}-${mention.entityId}-${mention.order}`}
            href={segment.href}
            className="font-medium text-primary underline-offset-2 transition-colors hover:text-primary/80 hover:underline"
            data-mention-type={mention.entityType}
            data-mention-entity-id={mention.entityId}
            data-mention-trigger={mention.trigger}
            data-mention-order={mention.order}
            title={`View details for ${segment.text}`}
          >
            {segment.text}
          </a>
        )
      })}
    </span>
  )
}
