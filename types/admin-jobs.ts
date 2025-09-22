import type { Database } from '@/lib/supabase'

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type ProfileRole = NonNullable<ProfileRow['role']>
export type ProfileStatus = ProfileRow['status']

export type AdminJobType = 'status_update' | 'notification'
export type AdminJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type ProfileRoleFilter = 'all' | ProfileRole
export type ProfileStatusFilter = 'all' | ProfileStatus

export type NotificationIntent = {
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  actionUrl?: string
}

export type BulkStatusUpdatePayload = {
  type: 'status_update'
  targetUserIds: string[]
  nextStatus: ProfileStatus
  notify: boolean
  notification?: NotificationIntent
  filters: {
    role: ProfileRoleFilter
    currentStatus: ProfileStatusFilter
  }
  summary?: {
    count: number
  }
}

export type BulkNotificationPayload = {
  type: 'notification'
  targetUserIds: string[]
  notification: NotificationIntent
  filters: {
    role: ProfileRoleFilter
    currentStatus: ProfileStatusFilter
  }
  summary?: {
    count: number
  }
}

export type AdminJobPayload = BulkStatusUpdatePayload | BulkNotificationPayload

export type AdminJobResultEntry = {
  userId: string
  success: boolean
  action: AdminJobType
  notified?: boolean
  error?: string
  timestamp: string
}

export type AdminJobResultSummary = {
  successes: number
  failures: number
}

export type AdminJobResult = {
  entries: AdminJobResultEntry[]
  summary: AdminJobResultSummary
}

export type AdminJobDTO = {
  id: string
  type: AdminJobType
  status: AdminJobStatus
  totalTasks: number
  processedTasks: number
  error: string | null
  requestedBy: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  cancelledAt: string | null
  payload: AdminJobPayload
  result: AdminJobResult | null
}

export type BulkStatusUpdateRequest = {
  role: ProfileRoleFilter
  currentStatus: ProfileStatusFilter
  nextStatus: ProfileStatus
  sendNotification: boolean
  notificationTitle?: string
  notificationMessage?: string
  notificationType?: NotificationIntent['type']
  actionUrl?: string
}

export type BulkNotificationRequest = {
  role: ProfileRoleFilter
  currentStatus: ProfileStatusFilter
  notificationTitle: string
  notificationMessage: string
  notificationType: NotificationIntent['type']
  actionUrl?: string
}

export type AdminJobActionResponse = {
  job?: AdminJobDTO
  error?: string
}
