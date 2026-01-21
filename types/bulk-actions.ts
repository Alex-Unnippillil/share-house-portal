export type BulkActionType = 'delete' | 'move' | 'tag' | 'export'

export type BulkEntityType = 'members' | 'documents'

export type BulkActionResult<T = unknown> = {
  success: boolean
  message?: string
  error?: string
  data?: T
}
