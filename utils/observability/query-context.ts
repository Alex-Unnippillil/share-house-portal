import { AsyncLocalStorage } from 'node:async_hooks'

export interface QueryContext {
  traceId?: string
  route?: string
  actor?: string
  metadata?: Record<string, unknown>
}

const storage = new AsyncLocalStorage<QueryContext>()

export function runWithQueryContext<T>(
  context: QueryContext,
  callback: () => Promise<T> | T
): Promise<T> | T {
  return storage.run(context, callback)
}

export function getQueryContext(): QueryContext | undefined {
  return storage.getStore()
}

export function mergeQueryContext(partial: Partial<QueryContext>) {
  const current = storage.getStore()
  if (current) {
    Object.assign(current, partial)
  }
}
