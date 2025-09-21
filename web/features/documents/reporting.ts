import type { DocumentRecord, DocumentReport, DocumentVisibility } from './types'

export type DocumentReportFilters = {
  categoryIds?: string[]
  visibility?: DocumentVisibility[]
  startDate?: Date
  endDate?: Date
}

function isWithinRange(date: Date, start?: Date, end?: Date) {
  if (start && date < start) {
    return false
  }
  if (end && date > end) {
    return false
  }
  return true
}

export function filterDocuments(
  documents: DocumentRecord[],
  filters: DocumentReportFilters,
): DocumentRecord[] {
  const visibilitySet = filters.visibility ? new Set(filters.visibility) : null
  const categorySet = filters.categoryIds ? new Set(filters.categoryIds) : null

  return documents.filter((document) => {
    if (visibilitySet && !visibilitySet.has(document.visibility)) {
      return false
    }

    if (categorySet && !categorySet.has(document.categoryId)) {
      return false
    }

    const createdAt = new Date(document.createdAt)
    if (!isWithinRange(createdAt, filters.startDate, filters.endDate)) {
      return false
    }

    return true
  })
}

export function buildDocumentReport(
  documents: DocumentRecord[],
  filters: DocumentReportFilters = {},
): DocumentReport {
  const filtered = filterDocuments(documents, filters)

  const totalsByCategory: DocumentReport['totalsByCategory'] = {}
  const totalsByVisibility: DocumentReport['totalsByVisibility'] = {
    private: { count: 0, size: 0 },
    shared: { count: 0, size: 0 },
    public: { count: 0, size: 0 },
  }

  let totalSize = 0

  filtered.forEach((doc) => {
    totalSize += doc.size

    if (!totalsByCategory[doc.categoryId]) {
      totalsByCategory[doc.categoryId] = { count: 0, size: 0 }
    }
    totalsByCategory[doc.categoryId].count += 1
    totalsByCategory[doc.categoryId].size += doc.size

    totalsByVisibility[doc.visibility].count += 1
    totalsByVisibility[doc.visibility].size += doc.size
  })

  return {
    rows: filtered.map((doc) => ({
      id: doc.id,
      name: doc.name,
      categoryId: doc.categoryId,
      categoryName: doc.categoryName,
      visibility: doc.visibility,
      size: doc.size,
      uploadedBy: doc.uploadedBy,
      uploadedByName: doc.uploadedByName,
      createdAt: doc.createdAt,
    })),
    totalSize,
    totalCount: filtered.length,
    totalsByCategory,
    totalsByVisibility,
  }
}

export function documentReportToCsv(report: DocumentReport): string {
  const header = [
    'Document',
    'Category',
    'Visibility',
    'Size (bytes)',
    'Uploaded By',
    'Uploaded By Name',
    'Uploaded At',
  ]

  const rows = report.rows.map((row) => [
    row.name,
    row.categoryName ?? row.categoryId,
    row.visibility,
    row.size.toString(),
    row.uploadedBy,
    row.uploadedByName ?? '',
    row.createdAt,
  ])

  return [header, ...rows]
    .map((columns) =>
      columns
        .map((column) => {
          const safe = column.replace(/"/g, '""')
          return /[",\n]/.test(safe) ? `"${safe}"` : safe
        })
        .join(','),
    )
    .join('\n')
}
