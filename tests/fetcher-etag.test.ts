import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clearFetcherCache, fetcher } from "@/lib/utils"

describe("fetcher ETag support", () => {
  beforeEach(() => {
    clearFetcherCache()
  })

  afterEach(() => {
    clearFetcherCache()
    vi.unstubAllGlobals()
  })

  it("stores the ETag from a successful response and reuses it", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "hello" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ETag: '"etag-1"',
        },
      })
    )

    const first = await fetcher<{ message: string }>("/api/documents")
    expect(first).toEqual({ message: "hello" })

    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 304,
        headers: {
          ETag: '"etag-1"',
        },
      })
    )

    const second = await fetcher<{ message: string }>("/api/documents")

    const headersArg = fetchMock.mock.calls[1]?.[1]?.headers
    const headers = headersArg instanceof Headers ? headersArg : new Headers(headersArg)
    expect(headers.get("If-None-Match")).toBe('"etag-1"')
    expect(second).toEqual({ message: "hello" })
  })

  it("updates the cached payload when a new ETag is returned", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ version: 1 }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ETag: '"etag-1"',
        },
      })
    )

    await fetcher("/api/documents")

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ version: 2 }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ETag: '"etag-2"',
        },
      })
    )

    const result = await fetcher<{ version: number }>("/api/documents")

    const headersArg = fetchMock.mock.calls[1]?.[1]?.headers
    const headers = headersArg instanceof Headers ? headersArg : new Headers(headersArg)
    expect(headers.get("If-None-Match")).toBe('"etag-1"')
    expect(result).toEqual({ version: 2 })
  })
})
