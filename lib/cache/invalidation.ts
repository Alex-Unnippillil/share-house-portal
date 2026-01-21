import { cacheRevalidationMonitor } from "@/lib/monitoring/cache-revalidation"
import type { SupabaseWebhookPayload } from "@/types/supabase-webhooks"

type CacheRevalidationStatus = "revalidated" | "skipped" | "failed"

export type CacheRevalidationTarget = "documents" | "notifications"

export interface CacheRevalidationContext {
  event: SupabaseWebhookPayload
}

export type CacheRevalidator = (
  context: CacheRevalidationContext
) => Promise<void> | void

const revalidators = new Map<CacheRevalidationTarget, CacheRevalidator>()

export function registerCacheRevalidator(
  target: CacheRevalidationTarget,
  revalidator: CacheRevalidator
) {
  revalidators.set(target, revalidator)
}

export function getCacheRevalidator(
  target: CacheRevalidationTarget
): CacheRevalidator | undefined {
  return revalidators.get(target)
}

export function removeCacheRevalidator(target: CacheRevalidationTarget) {
  revalidators.delete(target)
}

export function listRegisteredCacheTargets(): CacheRevalidationTarget[] {
  return Array.from(revalidators.keys())
}

export async function executeCacheRevalidator(
  target: CacheRevalidationTarget,
  context: CacheRevalidationContext
): Promise<{
  target: CacheRevalidationTarget
  status: CacheRevalidationStatus
  error?: string
}> {
  const revalidator = revalidators.get(target)
  if (!revalidator) {
    cacheRevalidationMonitor.record({
      target,
      status: "skipped",
      eventType: context.event.type,
      table: context.event.table,
      reason: "missing_revalidator",
    })

    return { target, status: "skipped" }
  }

  try {
    await revalidator(context)
    cacheRevalidationMonitor.record({
      target,
      status: "success",
      eventType: context.event.type,
      table: context.event.table,
    })
    return { target, status: "revalidated" }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    cacheRevalidationMonitor.record({
      target,
      status: "failure",
      eventType: context.event.type,
      table: context.event.table,
      error: message,
    })
    return { target, status: "failed", error: message }
  }
}

export async function executeCacheRevalidators(
  targets: CacheRevalidationTarget[],
  context: CacheRevalidationContext
) {
  const results = [] as Array<{
    target: CacheRevalidationTarget
    status: CacheRevalidationStatus
    error?: string
  }>

  for (const target of targets) {
    const result = await executeCacheRevalidator(target, context)
    results.push(result)
  }

  return results
}
