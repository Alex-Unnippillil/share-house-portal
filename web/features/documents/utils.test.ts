import { describe, expect, it } from 'vitest'
import {
  buildObjectKey,
  canEditDocument,
  canViewDocument,
  formatBytes,
  normalizeFileName,
  validateFileBeforeUpload,
  type DocumentPermissionModel,
  type DocumentUser,
} from './utils'

describe('normalizeFileName', () => {
  it('sanitises whitespace and special characters', () => {
    expect(normalizeFileName(' Quarterly Report 2024!.PDF ')).toBe('quarterly-report-2024.pdf')
  })

  it('falls back to default name when value is blank', () => {
    expect(normalizeFileName('   ')).toBe('file')
  })
})

describe('buildObjectKey', () => {
  it('creates deterministic storage keys using category and user metadata', () => {
    const key = buildObjectKey('policies', 'handbook.pdf', { userId: 'user-123', timestamp: 123456789 })
    expect(key).toBe('policies/user-123/21i3v9-handbook.pdf')
  })
})

describe('permission helpers', () => {
  const permissions: DocumentPermissionModel = {
    ownerId: 'owner-1',
    visibility: 'shared',
    allowedRoles: ['manager'],
    allowedUsers: ['user-2'],
  }

  const owner: DocumentUser = { id: 'owner-1', role: 'admin' }
  const manager: DocumentUser = { id: 'user-3', role: 'manager' }
  const collaborator: DocumentUser = { id: 'user-2', role: 'user' }
  const outsider: DocumentUser = { id: 'user-4', role: 'user' }

  it('allows owners and granted roles to view', () => {
    expect(canViewDocument(owner, permissions)).toBe(true)
    expect(canViewDocument(manager, permissions)).toBe(true)
    expect(canViewDocument(collaborator, permissions)).toBe(true)
  })

  it('prevents unauthorised viewers', () => {
    expect(canViewDocument(outsider, permissions)).toBe(false)
    expect(canViewDocument(null, permissions)).toBe(false)
  })

  it('only allows owners or authorised roles to edit', () => {
    expect(canEditDocument(owner, permissions)).toBe(true)
    expect(canEditDocument(manager, permissions)).toBe(true)
    expect(canEditDocument(collaborator, permissions)).toBe(false)
  })
})

describe('validateFileBeforeUpload', () => {
  const config = { maxFileSizeBytes: 2 * 1024 * 1024, allowedMimeTypes: ['application/pdf', 'image/'] }

  it('accepts valid files', () => {
    const result = validateFileBeforeUpload({ size: 1_000_000, type: 'application/pdf' }, config)
    expect(result).toEqual({ valid: true })
  })

  it('rejects files that are too large', () => {
    const result = validateFileBeforeUpload({ size: 3_000_000, type: 'application/pdf' }, config)
    expect(result).toMatchObject({ valid: false })
  })

  it('rejects unsupported mime types', () => {
    const result = validateFileBeforeUpload({ size: 500_000, type: 'application/zip' }, config)
    expect(result).toMatchObject({ valid: false })
  })
})

describe('formatBytes', () => {
  it('formats byte counts in a human readable way', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1024 * 1024)).toBe('1 MB')
  })
})
