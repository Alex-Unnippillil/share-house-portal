'use client'

import { track } from '@vercel/analytics'

export type PaginationAction =
  | 'first'
  | 'previous'
  | 'next'
  | 'last'
  | 'jump'
  | 'realtime'

export interface PaginationMetadata {
  pageSize?: number
  totalPages?: number
  totalItems?: number
  [key: string]: unknown
}

export function trackPaginationEvent(
  context: string,
  page: number,
  action: PaginationAction,
  metadata: PaginationMetadata = {}
) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    track('pagination_interaction', {
      context,
      page,
      action,
      ...metadata
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[analytics] pagination tracking skipped', error)
    }
  }
}
