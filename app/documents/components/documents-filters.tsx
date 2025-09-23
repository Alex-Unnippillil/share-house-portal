'use client'

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import type {
  DocumentListFilters,
  DocumentListSort,
  DocumentStatus,
  DocumentType,
} from '@/types/documents'
import type { DocumentColumnId, DocumentCsvColumn } from '@/lib/documents/csv-columns'
import { Download, Filter, X } from 'lucide-react'

interface DocumentsFiltersProps {
  filters: DocumentListFilters
  onFiltersChange: (filters: DocumentListFilters) => void
  sort: DocumentListSort
  onSortChange: (sort: DocumentListSort) => void
  columns: DocumentCsvColumn[]
  columnVisibility: Record<DocumentColumnId, boolean>
  onColumnVisibilityChange: (columnId: DocumentColumnId, visible: boolean) => void
  onExport?: () => void
  exporting?: boolean
}

export function DocumentsFilters({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  columns,
  columnVisibility,
  onColumnVisibilityChange,
  onExport,
  exporting = false,
}: DocumentsFiltersProps) {
  const statusOptions: { value: DocumentStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending_signature', label: 'Pending Signature' },
    { value: 'signed', label: 'Signed' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const typeOptions: { value: DocumentType; label: string }[] = [
    { value: 'lease', label: 'Lease' },
    { value: 'addendum', label: 'Addendum' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' },
  ]

  const toggleStatusFilter = (status: DocumentStatus, checked: boolean) => {
    const currentStatuses = filters.status || []
    const nextStatuses = checked
      ? Array.from(new Set([...currentStatuses, status]))
      : currentStatuses.filter((item) => item !== status)

    onFiltersChange({
      ...filters,
      status: nextStatuses.length > 0 ? nextStatuses : undefined,
    })
  }

  const toggleTypeFilter = (type: DocumentType, checked: boolean) => {
    const currentTypes = filters.type || []
    const nextTypes = checked
      ? Array.from(new Set([...currentTypes, type]))
      : currentTypes.filter((item) => item !== type)

    onFiltersChange({
      ...filters,
      type: nextTypes.length > 0 ? nextTypes : undefined,
    })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const handleColumnToggle = (columnId: DocumentColumnId, checked: boolean) => {
    if (!checked && columnId === 'title') {
      return
    }

    onColumnVisibilityChange(columnId, checked)
  }

  const sortOptions: { id: string; label: string; sort: DocumentListSort }[] = [
    {
      id: 'created_desc',
      label: 'Newest first',
      sort: { column: 'created_at', direction: 'desc' },
    },
    {
      id: 'created_asc',
      label: 'Oldest first',
      sort: { column: 'created_at', direction: 'asc' },
    },
    {
      id: 'title_asc',
      label: 'Title A–Z',
      sort: { column: 'title', direction: 'asc' },
    },
    {
      id: 'title_desc',
      label: 'Title Z–A',
      sort: { column: 'title', direction: 'desc' },
    },
    {
      id: 'status_asc',
      label: 'Status A–Z',
      sort: { column: 'status', direction: 'asc' },
    },
  ]

  const currentSortId =
    sortOptions.find(
      (option) =>
        option.sort.column === sort.column && option.sort.direction === sort.direction,
    )?.id ?? 'created_desc'

  const activeFilterCount =
    (filters.status?.length || 0) +
    (filters.type?.length || 0) +
    (filters.tenant_id ? 1 : 0) +
    (filters.unit_id ? 1 : 0) +
    (filters.date_from ? 1 : 0) +
    (filters.date_to ? 1 : 0)

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 size-4" />
            Status
            {filters.status && filters.status.length > 0 && (
              <Badge variant="secondary" className="ml-2 size-4 p-0 text-xs">
                {filters.status.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {statusOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.status?.includes(option.value) || false}
              onCheckedChange={(checked) =>
                toggleStatusFilter(option.value, checked === true)
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Type
            {filters.type && filters.type.length > 0 && (
              <Badge variant="secondary" className="ml-2 size-4 p-0 text-xs">
                {filters.type.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {typeOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.type?.includes(option.value) || false}
              onCheckedChange={(checked) =>
                toggleTypeFilter(option.value, checked === true)
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Sort: {sortOptions.find((option) => option.id === currentSortId)?.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={currentSortId}
            onValueChange={(value) => {
              const option = sortOptions.find((item) => item.id === value)
              if (option) {
                onSortChange(option.sort)
              }
            }}
          >
            {sortOptions.map((option) => (
              <DropdownMenuRadioItem key={option.id} value={option.id}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="mr-2 size-4" />
          Clear ({activeFilterCount})
        </Button>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((column) => {
              const checked = columnVisibility[column.id] ?? true
              const disabled = column.id === 'title'

              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    handleColumnToggle(column.id, checked === true)
                  }
                >
                  {column.label}
                  {disabled ? (
                    <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                      Required
                    </span>
                  ) : null}
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {onExport ? (
          <Button
            variant="default"
            size="sm"
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-2"
          >
            <Download className="size-4" />
            {exporting ? 'Preparing…' : 'Export CSV'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
