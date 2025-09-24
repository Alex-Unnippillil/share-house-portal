import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { POST as handleSupabaseWebhook } from "@/app/api/supabase/revalidate/route"
import {
  getCacheRevalidator,
  registerCacheRevalidator,
  removeCacheRevalidator,
  type CacheRevalidator,
} from "@/lib/cache/invalidation"
import { cacheRevalidationMonitor } from "@/lib/monitoring/cache-revalidation"

const TEST_SECRET = "test-secret"

const createRequest = (body: unknown, authHeader?: string) =>
  new Request("http://localhost/api/supabase/revalidate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: authHeader ?? `Bearer ${TEST_SECRET}`,
    },
    body: JSON.stringify(body),
  })

describe("Supabase cache revalidation webhook", () => {
  let originalDocumentsRevalidator: CacheRevalidator | undefined

  beforeEach(() => {
    process.env.SUPABASE_WEBHOOK_SECRET = TEST_SECRET
    cacheRevalidationMonitor.clear()
    originalDocumentsRevalidator = getCacheRevalidator("documents")
  })

  afterEach(() => {
    if (originalDocumentsRevalidator) {
      registerCacheRevalidator("documents", originalDocumentsRevalidator)
    } else {
      removeCacheRevalidator("documents")
    }
    cacheRevalidationMonitor.clear()
    delete process.env.SUPABASE_WEBHOOK_SECRET
    vi.restoreAllMocks()
  })

  it("executes registered revalidators for matching events", async () => {
    const revalidatorSpy = vi.fn()
    registerCacheRevalidator("documents", () => {
      revalidatorSpy()
    })

    const response = await handleSupabaseWebhook(
      createRequest({
        type: "INSERT",
        table: "documents",
        schema: "public",
        record: { id: "doc-1" },
        old_record: null,
      })
    )

    expect(response.status).toBe(200)
    expect(revalidatorSpy).toHaveBeenCalledTimes(1)

    const body = await response.json()
    expect(body.results).toEqual([
      expect.objectContaining({
        target: "documents",
        table: "documents",
        type: "INSERT",
        status: "revalidated",
      }),
    ])

    const events = cacheRevalidationMonitor.getEvents()
    expect(
      events.some(
        (event) => event.target === "documents" && event.status === "success"
      )
    ).toBe(true)
  })

  it("captures failures from revalidators", async () => {
    const error = new Error("boom")
    registerCacheRevalidator("documents", () => {
      return Promise.reject(error)
    })

    const response = await handleSupabaseWebhook(
      createRequest({
        type: "UPDATE",
        table: "documents",
        schema: "public",
        record: { id: "doc-1" },
        old_record: { id: "doc-1" },
      })
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.results[0]).toMatchObject({
      target: "documents",
      status: "failed",
      error: "boom",
    })

    const events = cacheRevalidationMonitor.getEvents()
    expect(
      events.some(
        (event) => event.target === "documents" && event.status === "failure"
      )
    ).toBe(true)
  })

  it("rejects unauthorized webhook calls", async () => {
    const response = await handleSupabaseWebhook(
      createRequest(
        {
          type: "INSERT",
          table: "documents",
          schema: "public",
          record: { id: "doc-1" },
          old_record: null,
        },
        "Bearer invalid"
      )
    )

    expect(response.status).toBe(401)
  })
})
