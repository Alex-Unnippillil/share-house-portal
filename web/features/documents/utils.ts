import type { DocumentPermissionUpdate, DocumentVisibility } from './types'

export type DocumentUser = {
  id: string
  role: string
}

export type DocumentPermissionModel = DocumentPermissionUpdate & {
  ownerId: string
}

const DEFAULT_FILE_NAME = 'file'

export function normalizeFileName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) {
    return DEFAULT_FILE_NAME
  }

  const extensionMatch = trimmed.match(/\.([A-Za-z0-9]{1,8})$/)
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : null
  const base = extensionMatch
    ? trimmed.slice(0, trimmed.length - extensionMatch[0].length)
    : trimmed

  const normalizedBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-]+|[-]+$/g, '')

  const safeBase = normalizedBase || DEFAULT_FILE_NAME

  if (extension) {
    return `${safeBase}.${extension}`
  }

  return safeBase
}

export function buildObjectKey(
  categoryId: string,
  fileName: string,
  options: { userId?: string; timestamp?: number } = {},
): string {
  const safeName = normalizeFileName(fileName)
  const timestamp = (options.timestamp ?? Date.now()).toString(36)
  const userSegment = options.userId ? `${options.userId}/` : ''
  return `${categoryId}/${userSegment}${timestamp}-${safeName}`
}

export function canViewDocument(
  user: DocumentUser | null,
  permissions: DocumentPermissionModel,
): boolean {
  if (permissions.visibility === 'public') {
    return true
  }

  if (!user) {
    return false
  }

  if (user.id === permissions.ownerId) {
    return true
  }

  if (permissions.allowedUsers.includes(user.id)) {
    return true
  }

  if (
    permissions.visibility === 'shared' &&
    permissions.allowedRoles.some((role) => role.toLowerCase() === user.role.toLowerCase())
  ) {
    return true
  }

  return false
}

export function canEditDocument(
  user: DocumentUser | null,
  permissions: DocumentPermissionModel,
): boolean {
  if (!user) {
    return false
  }

  if (user.id === permissions.ownerId) {
    return true
  }

  return permissions.allowedRoles.some((role) => role.toLowerCase() === user.role.toLowerCase())
}

export type UploadValidationConfig = {
  maxFileSizeBytes: number
  allowedMimeTypes: string[]
}

export function validateFileBeforeUpload(
  file: { size: number; type: string },
  config: UploadValidationConfig,
): { valid: true } | { valid: false; reason: string } {
  if (file.size > config.maxFileSizeBytes) {
    return {
      valid: false,
      reason: `File exceeds maximum size of ${Math.round(config.maxFileSizeBytes / (1024 * 1024))}MB`,
    }
  }

  if (
    config.allowedMimeTypes.length > 0 &&
    !config.allowedMimeTypes.some((allowed) => {
      if (allowed.endsWith('/*')) {
        return file.type.startsWith(allowed.slice(0, -1))
      }
      if (allowed.endsWith('/')) {
        return file.type.startsWith(allowed)
      }
      return file.type === allowed
    })
  ) {
    return {
      valid: false,
      reason: 'File type is not allowed for uploads',
    }
  }

  return { valid: true }
}

export function mergePermissionUpdates(
  existing: DocumentPermissionModel,
  update: Partial<DocumentPermissionUpdate>,
): DocumentPermissionModel {
  return {
    ownerId: existing.ownerId,
    visibility: update.visibility ?? existing.visibility,
    allowedRoles: update.allowedRoles ?? existing.allowedRoles,
    allowedUsers: update.allowedUsers ?? existing.allowedUsers,
  }
}

export function visibilityLabel(visibility: DocumentVisibility): string {
  switch (visibility) {
    case 'private':
      return 'Private (owner only)'
    case 'shared':
      return 'Shared (restricted access)'
    case 'public':
      return 'Public (everyone in workspace)'
    default:
      return visibility
  }
}

export function formatBytes(size: number): string {
  if (Number.isNaN(size) || size <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / 1024 ** exponent
  const precision = value < 10 && exponent > 0 ? 1 : 0
  const formatted = value.toFixed(precision)
  const normalized = precision > 0 ? Number(formatted).toString() : formatted
  return `${normalized} ${units[exponent]}`
}
