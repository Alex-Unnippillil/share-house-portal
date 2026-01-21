'use client'

import { useTransition } from 'react'

import { Download, FolderInput, Tag as TagIcon, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useTableSelection } from '@/components/ui/Table'
import { cn } from '@/lib/utils'
import {
  bulkDeleteDocuments,
  bulkExportDocuments,
  bulkMoveDocuments,
  bulkTagDocuments,
} from '@/app/documents/actions/bulk'
import {
  bulkDeleteMembers,
  bulkExportMembers,
  bulkMoveMembers,
  bulkTagMembers,
} from '@/app/dashboard/members/actions/bulk'
import type { BulkActionResult, BulkActionType, BulkEntityType } from '@/types/bulk-actions'

type BulkActionPayload = { ids: string[]; [key: string]: unknown }

type ToastInvoker = (options: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void

export type BulkActionHandler = (payload: BulkActionPayload) => Promise<BulkActionResult>

export type BulkActionHandlers = Record<BulkEntityType, Record<BulkActionType, BulkActionHandler>>

const defaultHandlers: BulkActionHandlers = {
  members: {
    delete: bulkDeleteMembers,
    move: bulkMoveMembers,
    tag: bulkTagMembers,
    export: bulkExportMembers,
  },
  documents: {
    delete: bulkDeleteDocuments,
    move: bulkMoveDocuments,
    tag: bulkTagDocuments,
    export: bulkExportDocuments,
  },
}

function getDefaultSuccessMessage(action: BulkActionType, entity: BulkEntityType, count: number) {
  const singular = entity === 'members' ? 'member' : 'document'
  const label = count === 1 ? singular : `${singular}s`

  switch (action) {
    case 'delete':
      return `Deleted ${count} ${label}.`
    case 'move':
      return `Moved ${count} ${label}.`
    case 'tag':
      return `Tagged ${count} ${label}.`
    case 'export':
      return `Started export for ${count} ${label}.`
    default:
      return `Updated ${count} ${label}.`
  }
}

export async function performBulkAction({
  actionType,
  entityType,
  payload,
  handlers,
  toastImpl,
}: {
  actionType: BulkActionType
  entityType: BulkEntityType
  payload: BulkActionPayload
  handlers: BulkActionHandlers
  toastImpl: ToastInvoker
}): Promise<BulkActionResult> {
  if (!payload.ids || payload.ids.length === 0) {
    toastImpl({
      title: 'No rows selected',
      description: 'Select at least one row before performing a bulk action.',
      variant: 'destructive',
    })
    return { success: false, error: 'No rows selected' }
  }

  const handler = handlers[entityType]?.[actionType]

  if (!handler) {
    toastImpl({
      title: 'Unsupported action',
      description: 'This bulk action is not available.',
      variant: 'destructive',
    })
    return { success: false, error: 'Unsupported action' }
  }

  try {
    const result = await handler(payload)

    if (result.success) {
      toastImpl({
        title: 'Bulk action completed',
        description: result.message ?? getDefaultSuccessMessage(actionType, entityType, payload.ids.length),
      })
      return result
    }

    toastImpl({
      title: 'Bulk action failed',
      description: result.error ?? 'Unable to complete the bulk action.',
      variant: 'destructive',
    })
    return result
  } catch (error) {
    console.error('performBulkAction failed', error)
    toastImpl({
      title: 'Bulk action failed',
      description: 'An unexpected error occurred.',
      variant: 'destructive',
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

type BulkActionsBarProps = {
  entityType: BulkEntityType
  className?: string
  handlers?: BulkActionHandlers
}

export default function BulkActionsBar({
  entityType,
  className,
  handlers = defaultHandlers,
}: BulkActionsBarProps) {
  const { selectedRowIds, clearSelection } = useTableSelection()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const selectedCount = selectedRowIds.length
  const disabled = isPending || selectedCount === 0

  const execute = (actionType: BulkActionType, payload: BulkActionPayload) => {
    startTransition(() => {
      void performBulkAction({
        actionType,
        entityType,
        payload,
        handlers,
        toastImpl: toast,
      }).then((result) => {
        if (result.success && actionType !== 'export') {
          clearSelection()
        }
      })
    })
  }

  const handleDelete = () => {
    execute('delete', { ids: selectedRowIds })
  }

  const handleMove = () => {
    const destinationId = window.prompt('Enter the destination identifier for the selected items:')
    if (!destinationId) {
      toast({
        title: 'Destination required',
        description: 'Provide a destination to move the selected items.',
        variant: 'destructive',
      })
      return
    }

    execute('move', { ids: selectedRowIds, destinationId })
  }

  const handleTag = () => {
    const tagValue = window.prompt('Enter a tag to apply to the selected items:')
    if (!tagValue) {
      toast({
        title: 'Tag required',
        description: 'Provide a tag before applying it to the selected items.',
        variant: 'destructive',
      })
      return
    }

    execute('tag', { ids: selectedRowIds, tag: tagValue })
  }

  const handleExport = () => {
    execute('export', { ids: selectedRowIds, format: 'csv' })
  }

  const selectionLabel = selectedCount === 1 ? 'item selected' : 'items selected'

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-md border border-dashed border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/30',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {selectedCount > 0 ? `${selectedCount} ${selectionLabel}` : 'Select rows to enable bulk actions.'}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={disabled}
          >
            <Trash2 className="mr-2 size-4" /> Delete
          </Button>
          <Button size="sm" variant="secondary" onClick={handleMove} disabled={disabled}>
            <FolderInput className="mr-2 size-4" /> Move
          </Button>
          <Button size="sm" variant="secondary" onClick={handleTag} disabled={disabled}>
            <TagIcon className="mr-2 size-4" /> Tag
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={disabled}>
            <Download className="mr-2 size-4" /> Export
          </Button>
        </div>
      </div>
    </div>
  )
}
