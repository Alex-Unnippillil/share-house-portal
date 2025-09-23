import type { Json } from "@/lib/supabase"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

const RECENT_ACTIVITY_STORAGE_KEY = "share-house-portal:recent-activity"
const RECENT_ACTIVITY_LIMIT = 15

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">

export type RecentActivityEntry = {
  route: string
  label: string
  entityId?: string
  entityType?: string
  accessedAt: string
}

export type RecordRecentActivityInput = {
  route: string
  label: string
  entityId?: string
  entityType?: string
  accessedAt?: string
}

type RecordOptions = {
  supabase?: TypedSupabaseClient | null
  userId?: string | null
  storage?: StorageLike
  limit?: number
}

type LoadOptions = {
  supabase?: TypedSupabaseClient | null
  userId?: string | null
  storage?: StorageLike
  limit?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isRecentActivityEntry(value: unknown): value is RecentActivityEntry {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.route === "string" &&
    typeof value.label === "string" &&
    typeof value.accessedAt === "string"
  )
}

function parseEntries(value: unknown): RecentActivityEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isRecentActivityEntry)
    .map((entry) => ({
      ...entry,
      entityId: typeof entry.entityId === "string" ? entry.entityId : undefined,
      entityType: typeof entry.entityType === "string" ? entry.entityType : undefined,
    }))
    .sort((a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime())
}

function entryKey(entry: Pick<RecentActivityEntry, "route" | "entityId">) {
  return entry.entityId ? `${entry.route}#${entry.entityId}` : entry.route
}

function normalizeLimit(limit?: number) {
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    return Math.min(Math.floor(limit), RECENT_ACTIVITY_LIMIT)
  }

  return RECENT_ACTIVITY_LIMIT
}

function mergeEntries(
  existing: RecentActivityEntry[],
  incoming: RecentActivityEntry,
  limit?: number,
): RecentActivityEntry[] {
  const deduped = existing.filter((entry) => entryKey(entry) !== entryKey(incoming))

  return [incoming, ...deduped]
    .sort((a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime())
    .slice(0, normalizeLimit(limit))
}

function resolveStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) {
    return storage
  }

  if (typeof window !== "undefined" && window?.localStorage) {
    return window.localStorage
  }

  return undefined
}

function readFromStorage(storage?: StorageLike): RecentActivityEntry[] {
  if (!storage) {
    return []
  }

  const raw = storage.getItem(RECENT_ACTIVITY_STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return parseEntries(parsed)
  } catch (error) {
    return []
  }
}

function writeToStorage(entries: RecentActivityEntry[], storage?: StorageLike) {
  if (!storage) {
    return
  }

  storage.setItem(RECENT_ACTIVITY_STORAGE_KEY, JSON.stringify(entries))
}

async function loadFromSupabase(
  supabase: TypedSupabaseClient,
  userId: string,
): Promise<RecentActivityEntry[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("metadata")
    .eq("id", userId)
    .single()

  if (error) {
    throw error
  }

  const metadata = isRecord(data?.metadata) ? data?.metadata : {}
  const stored = (metadata as { recentActivity?: unknown }).recentActivity
  return parseEntries(stored)
}

async function recordWithSupabase(
  supabase: TypedSupabaseClient,
  userId: string,
  entry: RecentActivityEntry,
  limit?: number,
): Promise<RecentActivityEntry[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("metadata")
    .eq("id", userId)
    .single()

  if (error) {
    throw error
  }

  const metadata = isRecord(data?.metadata) ? data?.metadata : {}
  const stored = (metadata as { recentActivity?: unknown }).recentActivity
  const existing = parseEntries(stored)
  const nextEntries = mergeEntries(existing, entry, limit)
  const nextMetadata = { ...metadata, recentActivity: nextEntries } as Json

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ metadata: nextMetadata })
    .eq("id", userId)

  if (updateError) {
    throw updateError
  }

  return nextEntries
}

export function getResumeEntry(
  entries: RecentActivityEntry[],
): RecentActivityEntry | null {
  return entries.length > 0 ? entries[0] : null
}

export async function recordRecentActivity(
  input: RecordRecentActivityInput,
  options: RecordOptions = {},
): Promise<RecentActivityEntry[]> {
  const entry: RecentActivityEntry = {
    route: input.route,
    label: input.label,
    entityId: input.entityId,
    entityType: input.entityType,
    accessedAt: input.accessedAt ?? new Date().toISOString(),
  }

  const storage = resolveStorage(options.storage)
  const limit = options.limit

  if (options.supabase && options.userId) {
    try {
      const entries = await recordWithSupabase(
        options.supabase,
        options.userId,
        entry,
        limit,
      )
      writeToStorage(entries, storage)
      return entries
    } catch (error) {
      // fall back to storage
    }
  }

  const existing = readFromStorage(storage)
  const nextEntries = mergeEntries(existing, entry, limit)
  writeToStorage(nextEntries, storage)

  return nextEntries
}

export async function loadRecentActivity(
  options: LoadOptions = {},
): Promise<RecentActivityEntry[]> {
  const storage = resolveStorage(options.storage)
  const limit = options.limit

  if (options.supabase && options.userId) {
    try {
      const entries = await loadFromSupabase(options.supabase, options.userId)
      if (entries.length > 0) {
        writeToStorage(entries, storage)
        return entries.slice(0, normalizeLimit(limit))
      }
    } catch (error) {
      // fall back to storage
    }
  }

  const entries = readFromStorage(storage)
  return entries.slice(0, normalizeLimit(limit))
}

export { RECENT_ACTIVITY_LIMIT, RECENT_ACTIVITY_STORAGE_KEY }
