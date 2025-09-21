import { UserError } from '@/lib/errors'
import type { AuthContext, PaginationOptions } from './types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 25
const MUTATION_ROLES = new Set(['admin', 'manager'] as const)

export function assertCanMutate(context: AuthContext) {
  if (!MUTATION_ROLES.has(context.role)) {
    throw new UserError('You are not authorized to perform this action.', {
      code: 'FORBIDDEN',
      role: context.role,
    })
  }
}

export function normalizePagination(options: PaginationOptions = {}) {
  const page = Math.max(options.page ?? DEFAULT_PAGE, 1)
  const pageSize = Math.max(options.pageSize ?? DEFAULT_PAGE_SIZE, 1)

  return { page, pageSize }
}

export function normalizeSearchTerm(search?: string) {
  if (!search) {
    return undefined
  }

  return `%${search.trim().replace(/[%_]/g, ch => `\\${ch}`).replace(/\s+/g, '%')}%`
}
