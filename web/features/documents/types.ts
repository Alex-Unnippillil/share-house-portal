export type DocumentVisibility = 'private' | 'shared' | 'public'

export type DocumentCategory = {
  id: string
  name: string
  description?: string | null
  visibility: DocumentVisibility
  allowedRoles: string[]
  createdAt: string
  updatedAt?: string | null
}

export type DocumentRecord = {
  id: string
  name: string
  categoryId: string
  categoryName?: string | null
  storagePath: string
  size: number
  visibility: DocumentVisibility
  allowedRoles: string[]
  allowedUsers: string[]
  uploadedBy: string
  uploadedByName?: string | null
  uploadedByEmail?: string | null
  createdAt: string
  updatedAt?: string | null
}

export type DocumentAuditEntry = {
  id: string
  documentId: string
  action: 'uploaded' | 'downloaded' | 'permission_updated' | 'deleted' | 'restored' | 'viewed'
  actorId: string
  actorName?: string | null
  actorEmail?: string | null
  context?: Record<string, unknown> | null
  createdAt: string
}

export type DocumentPermissionUpdate = {
  visibility: DocumentVisibility
  allowedRoles: string[]
  allowedUsers: string[]
}

export type DocumentReportRow = {
  id: string
  name: string
  categoryId: string
  categoryName?: string | null
  visibility: DocumentVisibility
  size: number
  uploadedBy: string
  uploadedByName?: string | null
  createdAt: string
}

export type DocumentReport = {
  rows: DocumentReportRow[]
  totalSize: number
  totalCount: number
  totalsByCategory: Record<string, { count: number; size: number }>
  totalsByVisibility: Record<DocumentVisibility, { count: number; size: number }>
}
