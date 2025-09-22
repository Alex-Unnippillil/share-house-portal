import { beforeEach, afterEach, describe, expect, it, vi, type Mock } from "vitest"

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}))

import { revalidateTag } from "next/cache"
import { withCache, clearCacheStore } from "@/lib/cache/store"
import { CACHE_TAGS, revalidateCacheTags, revalidateTables } from "@/lib/cache/tags"

const revalidateTagMock = revalidateTag as unknown as Mock

describe("cache tag helpers", () => {
  beforeEach(() => {
    clearCacheStore()
    vi.useFakeTimers()
    revalidateTagMock.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("serves cached values until the TTL expires", async () => {
    let loadCount = 0
    const cacheKey = "documents:list:test-user"
    const tags = [CACHE_TAGS.documents.list]

    const loader = async () => {
      loadCount += 1
      return [`doc-${loadCount}`]
    }

    const first = await withCache(cacheKey, { ttl: 5, tags }, loader)
    expect(loadCount).toBe(1)
    expect(first).toEqual(["doc-1"])

    const second = await withCache(cacheKey, { ttl: 5, tags }, loader)
    expect(loadCount).toBe(1)
    expect(second).toEqual(["doc-1"])

    vi.advanceTimersByTime(4000)
    const third = await withCache(cacheKey, { ttl: 5, tags }, loader)
    expect(loadCount).toBe(1)
    expect(third).toEqual(["doc-1"])

    vi.advanceTimersByTime(2000)
    const fourth = await withCache(cacheKey, { ttl: 5, tags }, loader)
    expect(loadCount).toBe(2)
    expect(fourth).toEqual(["doc-2"])
  })

  it("only invalidates caches sharing a tag", async () => {
    let documentLoads = 0
    let paymentLoads = 0

    await withCache("documents:list:a", { ttl: 60, tags: [CACHE_TAGS.documents.list] }, async () => {
      documentLoads += 1
      return [`doc-${documentLoads}`]
    })

    await withCache("payments:list:a", { ttl: 60, tags: [CACHE_TAGS.payments.list] }, async () => {
      paymentLoads += 1
      return [`pay-${paymentLoads}`]
    })

    expect(documentLoads).toBe(1)
    expect(paymentLoads).toBe(1)

    revalidateCacheTags(CACHE_TAGS.documents.list)
    expect(revalidateTagMock).toHaveBeenCalledWith(CACHE_TAGS.documents.list)

    const freshDocs = await withCache(
      "documents:list:a",
      { ttl: 60, tags: [CACHE_TAGS.documents.list] },
      async () => {
        documentLoads += 1
        return [`doc-${documentLoads}`]
      },
    )
    expect(documentLoads).toBe(2)
    expect(freshDocs).toEqual(["doc-2"])

    const cachedPayments = await withCache(
      "payments:list:a",
      { ttl: 60, tags: [CACHE_TAGS.payments.list] },
      async () => {
        paymentLoads += 1
        return [`pay-${paymentLoads}`]
      },
    )
    expect(paymentLoads).toBe(1)
    expect(cachedPayments).toEqual(["pay-1"])
  })

  it("revalidates every tag mapped to a Supabase table", async () => {
    let listLoads = 0
    let statsLoads = 0

    await withCache("documents:list:user", { ttl: 60, tags: [CACHE_TAGS.documents.list] }, async () => {
      listLoads += 1
      return listLoads
    })
    await withCache("documents:stats:user", { ttl: 60, tags: [CACHE_TAGS.documents.stats] }, async () => {
      statsLoads += 1
      return statsLoads
    })

    revalidateTagMock.mockClear()
    revalidateTables("document_signatures")

    expect(revalidateTagMock).toHaveBeenCalledWith(CACHE_TAGS.documents.list)
    expect(revalidateTagMock).toHaveBeenCalledWith(CACHE_TAGS.documents.stats)

    await withCache("documents:list:user", { ttl: 60, tags: [CACHE_TAGS.documents.list] }, async () => {
      listLoads += 1
      return listLoads
    })
    await withCache("documents:stats:user", { ttl: 60, tags: [CACHE_TAGS.documents.stats] }, async () => {
      statsLoads += 1
      return statsLoads
    })

    expect(listLoads).toBe(2)
    expect(statsLoads).toBe(2)
  })
})
