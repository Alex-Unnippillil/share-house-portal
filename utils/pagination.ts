import { z } from 'zod'

import type { PaginationMetadata, PaginationParams } from '@/types/pagination'

export const paginationParamsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  page: z.coerce.number().int().min(1).optional(),
  cursor: z.string().min(1).optional(),
})

function base64UrlEncode(input: string) {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4
  const padded = normalized + (padding ? '='.repeat(4 - padding) : '')
  return Buffer.from(padded, 'base64').toString('utf-8')
}

export function encodeCursor(offset: number) {
  if (!Number.isFinite(offset) || offset < 0) {
    throw new Error('Invalid offset for cursor encoding')
  }

  return base64UrlEncode(JSON.stringify({ offset }))
}

export function decodeCursor(cursor: string) {
  try {
    const parsed = JSON.parse(base64UrlDecode(cursor))

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.offset !== 'number' ||
      !Number.isFinite(parsed.offset) ||
      parsed.offset < 0
    ) {
      throw new Error('Invalid cursor payload')
    }

    return parsed.offset
  } catch (error) {
    throw new Error('Invalid cursor')
  }
}

export function normalizePaginationParams(
  pagination: PaginationParams | undefined,
  fallbackLimit = 10
) {
  const limit = pagination?.limit ?? fallbackLimit
  let offset = 0

  if (pagination?.cursor) {
    offset = decodeCursor(pagination.cursor)
  } else if (pagination?.page) {
    offset = (pagination.page - 1) * limit
  }

  return { limit, offset, pageOverride: pagination?.page }
}

export function buildPaginationMetadata({
  total,
  limit,
  offset,
  itemCount,
  pageOverride,
}: {
  total: number
  limit: number
  offset: number
  itemCount: number
  pageOverride?: number
}): PaginationMetadata {
  const safeTotal = Math.max(total, 0)
  const pageCount = safeTotal === 0 ? 0 : Math.ceil(safeTotal / limit)
  const computedPage = safeTotal === 0 ? 0 : Math.floor(offset / limit) + 1

  let page = computedPage
  if (pageOverride !== undefined) {
    if (pageCount === 0) {
      page = 0
    } else {
      page = Math.min(Math.max(pageOverride, 1), pageCount)
    }
  }

  const hasNext = offset + itemCount < safeTotal
  const nextCursor = hasNext ? encodeCursor(offset + itemCount) : null
  const prevCursor = offset > 0 && safeTotal > 0 ? encodeCursor(Math.max(offset - limit, 0)) : null

  return {
    total: safeTotal,
    page,
    limit,
    pageCount,
    nextCursor,
    prevCursor,
  }
}
