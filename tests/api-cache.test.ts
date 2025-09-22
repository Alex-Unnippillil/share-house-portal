import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GET as getDocuments } from "@/app/api/documents/route"
import {
  buildCollectionCacheMetadata,
  clearFetcherCache,
  fetcher,
} from "@/lib/utils"

describe("documents API caching", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    clearFetcherCache()
  })

  afterEach(() => {
    global.fetch = originalFetch
    clearFetcherCache()
    vi.restoreAllMocks()
  })

  const createRequest = (url: string, init?: RequestInit) =>
    new Request(url, init)

  it("generates consistent cache metadata from documents", () => {
    const records = [
      { id: "1", updated_at: "2024-05-01T00:00:00.000Z" },
      { id: "2", updated_at: "2024-06-10T08:15:00.000Z" },
    ]

    const metadata = buildCollectionCacheMetadata(records)
    expect(metadata.count).toBe(2)
    expect(metadata.latestUpdatedAt).toBe("2024-06-10T08:15:00.000Z")
    expect(metadata.etag).toMatch(/^W\/\"[A-Za-z0-9_-]+\"$/)
  })

  it("returns 200 with an ETag for the first request", async () => {
    const request = createRequest("http://localhost/api/documents")
    const response = await getDocuments(request)

    expect(response.status).toBe(200)
    expect(response.headers.get("etag")).toBeTruthy()

    const body = await response.json()
    expect(body.meta.count).toBe(body.documents.length)
    expect(body.meta.latestUpdatedAt).toBeTruthy()
  })

  it("returns 304 when If-None-Match matches the generated ETag", async () => {
    const initialRequest = createRequest("http://localhost/api/documents")
    const initialResponse = await getDocuments(initialRequest)
    const etag = initialResponse.headers.get("etag")

    expect(etag).toBeTruthy()

    const conditionalRequest = createRequest("http://localhost/api/documents", {
      headers: {
        "If-None-Match": etag!,
      },
    })

    const conditionalResponse = await getDocuments(conditionalRequest)
    expect(conditionalResponse.status).toBe(304)
    expect(conditionalResponse.headers.get("etag")).toBe(etag)
  })

  it("reuses cached data when fetcher encounters a 304", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url

      const request = createRequest(url, init)
      return getDocuments(request)
    }) as typeof fetch

    const first = await fetcher<{
      documents: Array<{ id: string; updated_at: string }>
      meta: { revision: string }
    }>("http://localhost/api/documents")

    expect(first.documents).toHaveLength(2)
    expect(first.meta.revision).toBe("current")

    const second = await fetcher<typeof first>(
      "http://localhost/api/documents"
    )

    expect(second).toEqual(first)

    const updated = await fetcher<typeof first>(
      "http://localhost/api/documents?revision=revision2"
    )

    expect(updated.documents.length).toBe(3)
    expect(updated.meta.revision).toBe("revision2")
    expect(updated).not.toEqual(first)
  })
})
