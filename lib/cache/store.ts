export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

const cacheStore = new Map<string, CacheEntry<unknown>>();
const tagIndex = new Map<string, Set<string>>();

function cleanupKey(key: string, tags: string[]) {
  cacheStore.delete(key);
  for (const tag of tags) {
    const keys = tagIndex.get(tag);
    if (!keys) continue;
    keys.delete(key);
    if (keys.size === 0) {
      tagIndex.delete(tag);
    }
  }
}

export function clearCacheStore() {
  cacheStore.clear();
  tagIndex.clear();
}

export function getCacheEntry<T>(key: string): T | undefined {
  const entry = cacheStore.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cleanupKey(key, entry.tags);
    return undefined;
  }
  return entry.value as T;
}

export interface CacheOptions {
  ttl: number;
  tags: string[];
}

export function setCacheEntry<T>(key: string, value: T, { ttl, tags }: CacheOptions) {
  const uniqueTags = Array.from(new Set(tags));
  const expiresAt = Date.now() + Math.max(ttl, 0) * 1000;
  cacheStore.set(key, { value, expiresAt, tags: uniqueTags });

  for (const tag of uniqueTags) {
    if (!tagIndex.has(tag)) {
      tagIndex.set(tag, new Set());
    }
    tagIndex.get(tag)!.add(key);
  }
}

export async function withCache<T>(
  key: string,
  options: CacheOptions,
  loader: () => Promise<T>
): Promise<T> {
  const cached = getCacheEntry<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  const value = await loader();
  setCacheEntry(key, value, options);
  return value;
}

export function invalidateCacheByTag(tag: string) {
  const keys = tagIndex.get(tag);
  if (!keys) return;

  for (const key of Array.from(keys)) {
    const entry = cacheStore.get(key);
    if (!entry) continue;
    cleanupKey(key, entry.tags);
  }
}

export function invalidateCacheByTags(tags: string[]) {
  for (const tag of new Set(tags)) {
    invalidateCacheByTag(tag);
  }
}

export function getCacheKeys(): string[] {
  return Array.from(cacheStore.keys());
}
