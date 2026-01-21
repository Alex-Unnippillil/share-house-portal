import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type Env = NodeJS.ProcessEnv

const ORIGINAL_ENV = { ...process.env }

describe("supabase configuration", () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV } as Env
    vi.clearAllMocks()
  })

  it("derives the REST URL from DATABASE_URL when creating a server client", async () => {
    process.env.DATABASE_URL =
      "postgresql://postgres:example@db.roommates.supabase.co:5432/postgres"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"

    const createServerClient = vi.fn(() => ({
      auth: {
        getUser: vi.fn(),
      },
    }))

    const cookiesMock = vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
    }))

    vi.doMock("@supabase/ssr", () => ({
      createServerClient,
    }))

    vi.doMock("next/headers", () => ({
      cookies: cookiesMock,
    }))

    const { createClient } = await import("@/utils/supabase/server")

    createClient()

    expect(createServerClient).toHaveBeenCalledWith(
      "https://roommates.supabase.co",
      "test-anon-key",
      expect.objectContaining({ cookies: expect.any(Object) })
    )
  })

  it("falls back to explicit NEXT_PUBLIC_SUPABASE_URL when DATABASE_URL is absent", async () => {
    delete process.env.DATABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://manual.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"

    const { resolveSupabaseUrl } = await import("@/utils/supabase/env")

    expect(resolveSupabaseUrl()).toBe("https://manual.supabase.co")
  })
})
