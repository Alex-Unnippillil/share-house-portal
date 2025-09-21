import { describe, expect, it } from 'vitest'
import { buildDocumentReport, documentReportToCsv } from './reporting'
import type { DocumentRecord } from './types'

describe('document reporting', () => {
  const documents: DocumentRecord[] = [
    {
      id: 'doc-1',
      name: 'Lease Agreement',
      categoryId: 'cat-lease',
      categoryName: 'Leases',
      storagePath: 'cat-lease/doc-1.pdf',
      size: 10_240,
      visibility: 'shared',
      allowedRoles: ['manager'],
      allowedUsers: [],
      uploadedBy: 'user-1',
      uploadedByName: 'Alice',
      uploadedByEmail: 'alice@example.com',
      createdAt: '2024-01-15T12:00:00.000Z',
      updatedAt: null,
    },
    {
      id: 'doc-2',
      name: 'Utility Bill',
      categoryId: 'cat-billing',
      categoryName: 'Billing',
      storagePath: 'cat-billing/doc-2.pdf',
      size: 5_120,
      visibility: 'public',
      allowedRoles: [],
      allowedUsers: [],
      uploadedBy: 'user-2',
      uploadedByName: 'Bob',
      uploadedByEmail: 'bob@example.com',
      createdAt: '2024-02-01T09:30:00.000Z',
      updatedAt: null,
    },
  ]

  it('applies visibility and category filters', () => {
    const report = buildDocumentReport(documents, {
      categoryIds: ['cat-lease'],
      visibility: ['shared'],
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-03-01T00:00:00.000Z'),
    })

    expect(report.totalCount).toBe(1)
    expect(report.totalSize).toBe(10_240)
    expect(Object.keys(report.totalsByCategory)).toEqual(['cat-lease'])
    expect(report.totalsByVisibility.shared.count).toBe(1)
  })

  it('serialises the report to CSV format', () => {
    const report = buildDocumentReport(documents)
    const csv = documentReportToCsv(report)

    const lines = csv.trim().split('\n')
    expect(lines[0]).toContain('Document,Category,Visibility,Size (bytes),Uploaded By,Uploaded By Name,Uploaded At')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('Lease Agreement')
  })
})
