'use server'

import { createSupbaseServerClient } from '@/utils/supaone'
import { sendInAppNotification } from '@/lib/notifications'
import {
  createMessageWithMentions,
  type MentionNotifier,
} from '@/lib/messaging/mentions'
import type { StoredMention } from '@/lib/messaging/types'

interface CreateThreadMessageInput {
  threadId: string
  senderId: string
  senderDisplayName: string
  content: string
  mentions: StoredMention[]
}

const mentionNotifier: MentionNotifier = async payload => {
  await sendInAppNotification({
    userId: payload.recipientId,
    title: `Mentioned by ${payload.senderDisplayName}`,
    message: payload.preview,
    type: 'info',
    actionUrl: `/messaging/${payload.message.thread_id}?focus=${payload.message.id}`,
    metadata: {
      kind: 'mention',
      threadId: payload.message.thread_id,
      messageId: payload.message.id,
      actorId: payload.senderId,
      actorName: payload.senderDisplayName,
      mention: payload.mention,
    },
  })
}

export async function createThreadMessage(input: CreateThreadMessageInput) {
  const supabase = await createSupbaseServerClient()

  await createMessageWithMentions(
    supabase,
    {
      threadId: input.threadId,
      senderId: input.senderId,
      senderDisplayName: input.senderDisplayName,
      content: input.content,
      mentions: input.mentions,
    },
    mentionNotifier,
  )
}
