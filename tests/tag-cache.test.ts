import { beforeEach, describe, expect, it, vi } from "vitest"

import { clearTagCache, fetchWithTagCache, invalidateTagCache } from "@/lib/cache/tags"

describe("tag-based cache helper", () => {
  beforeEach(() => {
    clearTagCache()
  })

  it("returns cached data on subsequent reads", async () => {
    const fetcher = vi
      .fn<[], Promise<string[]>>()
      .mockResolvedValueOnce(["doc-1"])
      .mockResolvedValueOnce(["doc-2"])

    const first = await fetchWithTagCache("documents:user-123:{}", ["documents"], fetcher)
    expect(first.cacheHit).toBe(false)
    expect(first.data).toEqual(["doc-1"])

    const second = await fetchWithTagCache("documents:user-123:{}", ["documents"], fetcher)
    expect(second.cacheHit).toBe(true)
    expect(second.data).toEqual(["doc-1"])

    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it("fetches fresh data after invalidation", async () => {
    const fetcher = vi
      .fn<[], Promise<string[]>>()
      .mockResolvedValueOnce(["initial"])
      .mockResolvedValueOnce(["updated"])

    await fetchWithTagCache("documents:user-123:{}", ["documents"], fetcher)
    expect(fetcher).toHaveBeenCalledTimes(1)

    invalidateTagCache(["documents"])

    const refreshed = await fetchWithTagCache("documents:user-123:{}", ["documents"], fetcher)
    expect(refreshed.cacheHit).toBe(false)
    expect(refreshed.data).toEqual(["updated"])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it("supports invalidating scoped tags without duplicate fetches", async () => {
    const fetcher = vi
      .fn<[], Promise<string[]>>()
      .mockResolvedValueOnce(["tenant-a"])
      .mockResolvedValueOnce(["tenant-b"])

    await fetchWithTagCache("documents:user-123:{}", ["documents", "documents:user-123"], fetcher)
    expect(fetcher).toHaveBeenCalledTimes(1)

    invalidateTagCache(["documents:user-123"])

    const refreshed = await fetchWithTagCache("documents:user-123:{}", ["documents", "documents:user-123"], fetcher)
    expect(refreshed.cacheHit).toBe(false)
    expect(refreshed.data).toEqual(["tenant-b"])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
