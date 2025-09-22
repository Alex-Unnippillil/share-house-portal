import { addMinutes, subDays } from 'date-fns'

import type { Tables } from '@/lib/supabase'

export type MessageRecord = Tables<'messages'>

const roommates = [
  { name: 'Jordan', role: 'tenant' },
  { name: 'Avery', role: 'roommate' },
  { name: 'Riley', role: 'roommate' },
  { name: 'Morgan', role: 'property_manager' }
] as const

const threadSubjects = [
  'Wi-Fi stability',
  'Weekend chores rotation',
  'Guest parking logistics',
  'Shared pantry restock',
  'Game night planning'
]

const baseMessages: MessageRecord[] = Array.from({ length: 120 }, (_, index) => {
  const roommate = roommates[index % roommates.length]
  const threadId = `thread-${(index % threadSubjects.length) + 1}`
  const created = addMinutes(subDays(new Date(), Math.floor(index / 6)), -index * 3)

  return {
    id: `mock-message-${index + 1}`,
    thread_id: threadId,
    author_id: `user-${index % roommates.length}`,
    author_name: roommate.name,
    author_role: roommate.role as MessageRecord['author_role'],
    content: `${threadSubjects[index % threadSubjects.length]} update #${
      index + 1
    } — let’s keep everyone in sync on this.`,
    created_at: created.toISOString(),
    updated_at: created.toISOString(),
    metadata: {
      subject: threadSubjects[index % threadSubjects.length]
    }
  }
})

export function getMockMessagesPage(page: number, pageSize: number) {
  const total = baseMessages.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  const end = start + pageSize

  const items = baseMessages.slice(start, end)

  return {
    items,
    total,
    totalPages
  }
}
