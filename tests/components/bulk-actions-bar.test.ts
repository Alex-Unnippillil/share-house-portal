import { describe, expect, it, vi } from 'vitest'

import type { BulkActionResult } from '@/types/bulk-actions'
import type { BulkActionHandlers } from '@/components/tables/BulkActionsBar'
import { performBulkAction } from '@/components/tables/BulkActionsBar'

function createHandlers(): BulkActionHandlers {
  const stub = vi.fn(async (): Promise<BulkActionResult> => ({ success: true }))

  return {
    members: {
      delete: vi.fn(stub),
      move: vi.fn(stub),
      tag: vi.fn(stub),
      export: vi.fn(stub),
    },
    documents: {
      delete: vi.fn(stub),
      move: vi.fn(stub),
      tag: vi.fn(stub),
      export: vi.fn(stub),
    },
  }
}

describe('performBulkAction', () => {
  it('prevents actions when no rows are selected', async () => {
    const handlers = createHandlers()
    const toast = vi.fn()

    const result = await performBulkAction({
      actionType: 'delete',
      entityType: 'members',
      payload: { ids: [] },
      handlers,
      toastImpl: toast,
    })

    expect(result.success).toBe(false)
    expect(handlers.members.delete).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'No rows selected',
        variant: 'destructive',
      })
    )
  })

  it('executes the handler with the selected row identifiers and reports success', async () => {
    const handlers = createHandlers()
    const deleteHandler = vi.fn(async (): Promise<BulkActionResult> => ({
      success: true,
      message: 'Deleted 2 members',
    }))
    handlers.members.delete = deleteHandler
    const toast = vi.fn()

    const result = await performBulkAction({
      actionType: 'delete',
      entityType: 'members',
      payload: { ids: ['member-1', 'member-2'] },
      handlers,
      toastImpl: toast,
    })

    expect(result.success).toBe(true)
    expect(deleteHandler).toHaveBeenCalledWith({ ids: ['member-1', 'member-2'] })
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Bulk action completed',
        description: 'Deleted 2 members',
      })
    )
  })

  it('surfaces handler errors via destructive toasts', async () => {
    const handlers = createHandlers()
    const deleteHandler = vi.fn(async (): Promise<BulkActionResult> => ({
      success: false,
      error: 'Permission denied',
    }))
    handlers.members.delete = deleteHandler
    const toast = vi.fn()

    const result = await performBulkAction({
      actionType: 'delete',
      entityType: 'members',
      payload: { ids: ['member-1'] },
      handlers,
      toastImpl: toast,
    })

    expect(result.success).toBe(false)
    expect(deleteHandler).toHaveBeenCalledWith({ ids: ['member-1'] })
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Bulk action failed',
        description: 'Permission denied',
        variant: 'destructive',
      })
    )
  })
})
