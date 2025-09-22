import { addHours, subDays } from 'date-fns'

import type { Tables } from '@/lib/supabase'

export type NotificationRecord = Tables<'notifications'>

const notificationSubjects = [
  ['Rent reminder', 'success'],
  ['Maintenance update', 'info'],
  ['Visitor request', 'warning'],
  ['Amenity booking conflict', 'error']
] as const

const baseNotifications: NotificationRecord[] = Array.from(
  { length: 80 },
  (_, index) => {
    const [title, type] = notificationSubjects[index % notificationSubjects.length]
    const created = addHours(subDays(new Date(), Math.floor(index / 5)), -index * 2)

    return {
      id: `mock-notification-${index + 1}`,
      user_id: `user-${(index % 4) + 1}`,
      title: `${title} #${index + 1}`,
      message: `Automated alert ${index + 1} to keep the household aligned.`,
      type: type as NotificationRecord['type'],
      action_url: null,
      metadata: null,
      read: index % 3 === 0,
      created_at: created.toISOString(),
      updated_at: created.toISOString()
    }
  }
)

export function getMockNotificationsPage(page: number, pageSize: number) {
  const total = baseNotifications.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  const end = start + pageSize

  const items = baseNotifications.slice(start, end)
  const unread = baseNotifications.filter((item) => !item.read).length

  return {
    items,
    total,
    totalPages,
    unread
  }
}
