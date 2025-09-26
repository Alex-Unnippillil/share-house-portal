import { afterEach, describe, expect, it, vi } from "vitest"

describe("supabase admin client server guard", () => {
  afterEach(() => {
    // @ts-expect-error cleanup test stub
    delete global.window
  })

  it("throws when imported in a browser-like environment", async () => {
    vi.stubGlobal("window", {})

    await expect(import("@/lib/server-only/supabase-admin-client")).rejects.toThrow(
      /browser/i,
    )
  })
})
