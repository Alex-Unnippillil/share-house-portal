'use client'

import type { QueryClient, QueryFilters, QueryKey } from '@tanstack/react-query'

export type OptimisticStage = 'applied' | 'committed' | 'rolled-back'

export interface OptimisticSnapshot<TData> {
  queryKey: QueryKey
  data: TData | undefined
}

export interface OptimisticContext<TData> {
  operation: string
  timestamp: number
  snapshots: OptimisticSnapshot<TData>[]
}

interface OptimisticEvent {
  operation: string
  stage: OptimisticStage
  durationMs: number
  affectedQueries: number
  error?: unknown
}

function logEvent(event: OptimisticEvent) {
  if (process.env.NODE_ENV !== 'production') {
    const { operation, stage, durationMs, affectedQueries, error } = event
    const prefix = `[optimistic:${stage}] ${operation}`
    const details = { durationMs, affectedQueries, error }
    if (stage === 'rolled-back') {
      console.warn(prefix, details)
    } else {
      console.info(prefix, details)
    }
  }
}

export interface StartOptimisticUpdateOptions<TData> {
  queryClient: QueryClient
  filters: QueryFilters
  operation: string
  updateFn: (current: TData | undefined, queryKey: QueryKey) => TData
}

export function startOptimisticUpdate<TData>({
  queryClient,
  filters,
  operation,
  updateFn,
}: StartOptimisticUpdateOptions<TData>): OptimisticContext<TData> {
  const matched = queryClient.getQueriesData<TData>(filters)
  const snapshots: OptimisticSnapshot<TData>[] = matched.map(([queryKey, data]) => ({
    queryKey,
    data,
  }))

  if (snapshots.length === 0 && filters.queryKey) {
    const queryKey = filters.queryKey
    const next = updateFn(undefined, queryKey)
    queryClient.setQueryData(queryKey, next)
    snapshots.push({ queryKey, data: undefined })
  } else {
    matched.forEach(([queryKey, data]) => {
      const next = updateFn(data, queryKey)
      queryClient.setQueryData(queryKey, next)
    })
  }

  logEvent({
    operation,
    stage: 'applied',
    durationMs: 0,
    affectedQueries: snapshots.length,
  })

  return {
    operation,
    timestamp: Date.now(),
    snapshots,
  }
}

export function rollbackOptimisticUpdate<TData>(
  queryClient: QueryClient,
  context: OptimisticContext<TData> | undefined,
  error?: unknown,
) {
  if (!context) return

  context.snapshots.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data)
  })

  logEvent({
    operation: context.operation,
    stage: 'rolled-back',
    durationMs: Date.now() - context.timestamp,
    affectedQueries: context.snapshots.length,
    error,
  })
}

export interface FinalizeOptimisticUpdateOptions<TData> {
  queryClient: QueryClient
  context: OptimisticContext<TData> | undefined
  reconcileFn?: (
    current: TData | undefined,
    snapshot: OptimisticSnapshot<TData>,
  ) => TData | undefined
}

export function finalizeOptimisticUpdate<TData>({
  queryClient,
  context,
  reconcileFn,
}: FinalizeOptimisticUpdateOptions<TData>) {
  if (!context) return

  context.snapshots.forEach((snapshot) => {
    queryClient.setQueryData(snapshot.queryKey, (current: TData | undefined) => {
      if (!reconcileFn) {
        return current ?? snapshot.data
      }

      const reconciled = reconcileFn(current, snapshot)
      return typeof reconciled === 'undefined' ? current : reconciled
    })
  })

  logEvent({
    operation: context.operation,
    stage: 'committed',
    durationMs: Date.now() - context.timestamp,
    affectedQueries: context.snapshots.length,
  })
}
