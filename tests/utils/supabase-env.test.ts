import { afterEach, describe, expect, it } from "vitest"

import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  hasSupabasePublicEnv,
} from "@/utils/supabase/env"

const ORIGINAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ORIGINAL_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const ORIGINAL_SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ORIGINAL_SUPABASE_ANON_KEY
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    ORIGINAL_SUPABASE_PUBLISHABLE_KEY
})

describe("Supabase env resolvers", () => {
  it("returns configured URL and anon key values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://tenant-portal.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"

    expect(getSupabaseUrl()).toBe("https://tenant-portal.supabase.co")
    expect(getSupabaseAnonKey()).toBe("anon-key")
    expect(hasSupabasePublicEnv()).toBe(true)
  })

  it("uses publishable key when anon key is not set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://tenant-portal.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ""
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key"

    expect(getSupabaseAnonKey()).toBe("publishable-key")
    expect(hasSupabasePublicEnv()).toBe(true)
  })

  it("throws a clear configuration error when URL is missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ""
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ""

    expect(() => getSupabaseUrl()).toThrowError(
      "Missing Supabase public environment variable: Configure NEXT_PUBLIC_SUPABASE_URL.",
    )
    expect(hasSupabasePublicEnv()).toBe(false)
  })

  it("throws a clear configuration error when both public keys are missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://tenant-portal.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ""
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ""

    expect(() => getSupabaseAnonKey()).toThrowError(
      "Missing Supabase public environment variable: Configure NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    )
    expect(hasSupabasePublicEnv()).toBe(false)
  })
})
