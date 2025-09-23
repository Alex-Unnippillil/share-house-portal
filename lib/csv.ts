import type { DocumentColumnId } from "./documents/csv-columns"

export interface CsvColumn<T> {
  id: DocumentColumnId | string
  label: string
  getValue: (row: T) => unknown
}

function escapeCsvValue(value: string): string {
  if (value.includes("\"")) {
    value = value.replace(/"/g, '""')
  }

  if (/[",\n\r]/.test(value)) {
    return `"${value}"`
  }

  return value
}

export function convertRowsToCsv<T>({
  rows,
  columns,
  visibleColumnIds,
}: {
  rows: T[]
  columns: CsvColumn<T>[]
  visibleColumnIds: string[]
}): string {
  if (columns.length === 0 || visibleColumnIds.length === 0) {
    return ""
  }

  const columnSet = new Set(visibleColumnIds)
  const visibleColumns = columns.filter((column) => columnSet.has(column.id))

  if (visibleColumns.length === 0) {
    return ""
  }

  const header = visibleColumns.map((column) => escapeCsvValue(column.label)).join(",")

  const dataLines = rows.map((row) =>
    visibleColumns
      .map((column) => {
        const rawValue = column.getValue(row)
        if (rawValue === null || rawValue === undefined) {
          return ""
        }

        const stringValue = String(rawValue)
        return escapeCsvValue(stringValue)
      })
      .join(","),
  )

  return [header, ...dataLines].join("\n")
}
