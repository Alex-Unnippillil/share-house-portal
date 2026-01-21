'use client'

import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

export type TableSelectionContextValue = {
  selectedRowIds: string[]
  toggleRowSelection: (id: string) => void
  selectAllRows: () => void
  clearSelection: () => void
  isRowSelected: (id: string) => boolean
  registerRow: (id: string) => void
  unregisterRow: (id: string) => void
  allRowIds: string[]
  allSelected: boolean
  someSelected: boolean
}

const TableSelectionContext = createContext<TableSelectionContextValue | undefined>(undefined)

export function TableSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [allRowIds, setAllRowIds] = useState<string[]>([])

  const registerRow = useCallback((id: string) => {
    setAllRowIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const unregisterRow = useCallback((id: string) => {
    setAllRowIds((prev) => prev.filter((rowId) => rowId !== id))
    setSelectedRowIds((prev) => prev.filter((rowId) => rowId !== id))
  }, [])

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    )
  }, [])

  const clearSelection = useCallback(() => setSelectedRowIds([]), [])

  const selectAllRows = useCallback(() => {
    setSelectedRowIds((prev) => {
      const everyRowSelected = allRowIds.length > 0 && allRowIds.every((id) => prev.includes(id))
      return everyRowSelected ? [] : allRowIds
    })
  }, [allRowIds])

  const isRowSelected = useCallback((id: string) => selectedRowIds.includes(id), [selectedRowIds])

  const allSelected = useMemo(
    () => allRowIds.length > 0 && allRowIds.every((id) => selectedRowIds.includes(id)),
    [allRowIds, selectedRowIds]
  )

  const someSelected = useMemo(
    () => !allSelected && selectedRowIds.length > 0,
    [allSelected, selectedRowIds.length]
  )

  const value = useMemo<TableSelectionContextValue>(
    () => ({
      selectedRowIds,
      toggleRowSelection,
      selectAllRows,
      clearSelection,
      isRowSelected,
      registerRow,
      unregisterRow,
      allRowIds,
      allSelected,
      someSelected,
    }),
    [
      selectedRowIds,
      toggleRowSelection,
      selectAllRows,
      clearSelection,
      isRowSelected,
      registerRow,
      unregisterRow,
      allRowIds,
      allSelected,
      someSelected,
    ]
  )

  return (
    <TableSelectionContext.Provider value={value}>{children}</TableSelectionContext.Provider>
  )
}

export function useTableSelection(): TableSelectionContextValue {
  const context = useContext(TableSelectionContext)
  if (!context) {
    throw new Error('useTableSelection must be used within a TableSelectionProvider')
  }
  return context
}

type TableProps = {
  children: ReactNode
  headers: string[]
  selectable?: boolean
  className?: string
}

type TableStyle = React.CSSProperties & {
  '--table-grid-template'?: string
}

export default function Table({ children, headers, selectable = false, className }: TableProps) {
  const selection = useContext(TableSelectionContext)

  if (selectable && !selection) {
    throw new Error('A selectable table must be rendered within a TableSelectionProvider')
  }

  const selectionEnabled = selectable && Boolean(selection)
  const columnTemplate = selectionEnabled
    ? `40px repeat(${headers.length}, minmax(0, 1fr))`
    : `repeat(${headers.length}, minmax(0, 1fr))`

  const containerStyle: TableStyle = {
    '--table-grid-template': columnTemplate,
  }

  return (
    <div
      className={cn(
        'w-full overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800 dark:bg-gradient-dark',
        className
      )}
      style={containerStyle}
    >
      <div className="w-[900px] rounded-md bg-white py-5 dark:bg-inherit lg:w-full">
        <div
          className="grid items-center gap-4 border-b px-5 py-2 pb-5 text-sm font-medium text-muted-foreground dark:border-zinc-600"
          style={{ gridTemplateColumns: columnTemplate }}
        >
          {selectionEnabled && selection && (
            <Checkbox
              checked={selection.allSelected ? true : selection.someSelected ? 'indeterminate' : false}
              onCheckedChange={() => selection.selectAllRows()}
              aria-label="Select all rows"
            />
          )}

          {headers.map((header, index) => (
            <span key={header + index} className="truncate">
              {header}
            </span>
          ))}
        </div>

        {children}
      </div>
    </div>
  )
}
