export interface CacheResult<T> {
  data: T;
  cacheHit: boolean;
}

type Fetcher<T> = () => T | Promise<T>;

interface CacheEntry<T> {
  value: T;
  tags: Set<string>;
}

const dataCache = new Map<string, CacheEntry<unknown>>();
const tagIndex = new Map<string, Set<string>>();

function ensureTagIndex(tag: string) {
  if (!tagIndex.has(tag)) {
    tagIndex.set(tag, new Set());
  }
  return tagIndex.get(tag)!;
}

export async function fetchWithTagCache<T>(
  key: string,
  tags: string[],
  fetcher: Fetcher<T>
): Promise<CacheResult<T>> {
  const existing = dataCache.get(key);
  if (existing) {
    return { data: existing.value as T, cacheHit: true };
  }

  const data = await fetcher();
  const tagSet = new Set(tags);

  dataCache.set(key, { value: data, tags: tagSet });
  for (const tag of tagSet) {
    ensureTagIndex(tag).add(key);
  }

  return { data, cacheHit: false };
}

export function invalidateTagCache(tags: string[]) {
  const keysToRemove = new Set<string>();

  for (const tag of tags) {
    const keySet = tagIndex.get(tag);
    if (!keySet) continue;
    for (const key of keySet) {
      keysToRemove.add(key);
    }
  }

  for (const key of keysToRemove) {
    const entry = dataCache.get(key);
    if (!entry) continue;

    for (const tag of entry.tags) {
      const tagSet = tagIndex.get(tag);
      if (!tagSet) continue;
      tagSet.delete(key);
      if (tagSet.size === 0) {
        tagIndex.delete(tag);
      }
    }

    dataCache.delete(key);
  }
}

export function clearTagCache() {
  dataCache.clear();
  tagIndex.clear();
}
