import { afterAll, beforeAll } from "vitest"

import { startSupabaseTestEnvironment, stopSupabaseTestEnvironment } from "./supabase-test-env"

beforeAll(async () => {
  await startSupabaseTestEnvironment()
})

afterAll(async () => {
  await stopSupabaseTestEnvironment()
})
