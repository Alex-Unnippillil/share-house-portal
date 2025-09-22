import { describe, expect, it } from "vitest"

import {
  ensureFeatureEnabled,
  getFeatureFlags,
  type FeatureKey,
} from "@/lib/features"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

type FeatureRow = { household_id: string; key: FeatureKey; enabled: boolean }

function createSupabaseStub(rows: FeatureRow[]): TypedSupabaseClient {
  const tableData = rows.map(({ household_id, key, enabled }) => ({
    household_id,
    key,
    enabled,
  }))

  return {
    from(table: string) {
      if (table !== "features") {
        throw new Error(`Unexpected table requested: ${table}`)
      }

      return {
        select() {
          return new MockQueryBuilder(tableData)
        },
      } as never
    },
  } as unknown as TypedSupabaseClient
}

class MockQueryBuilder {
  private householdId?: string
  private keys?: readonly string[]

  constructor(private readonly rows: Array<{ household_id: string; key: string; enabled: boolean }>) {}

  select() {
    return this
  }

  eq(column: string, value: string) {
    if (column === "household_id") {
      this.householdId = value
    }
    return this
  }

  in(column: string, values: readonly string[]) {
    if (column === "key") {
      this.keys = values
    }
    return this
  }

  then<TResult1 = { data: Array<{ key: string; enabled: boolean }>; error: null }, TResult2 = never>(
    onfulfilled?: ((value: TResult1) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    try {
      const payload = this.execute()
      return Promise.resolve(payload).then(onfulfilled, onrejected)
    } catch (error) {
      return Promise.reject(error).then(onfulfilled, onrejected)
    }
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | undefined | null
  ): Promise<TResult> {
    try {
      const payload = this.execute()
      return Promise.resolve(payload).catch(onrejected)
    } catch (error) {
      return Promise.reject(error).catch(onrejected)
    }
  }

  finally(onfinally?: (() => void) | undefined | null): Promise<void> {
    try {
      const payload = this.execute()
      return Promise.resolve(payload).finally(onfinally)
    } catch (error) {
      return Promise.reject(error).finally(onfinally)
    }
  }

  private execute() {
    const filtered = this.rows.filter((row) => {
      if (this.householdId && row.household_id !== this.householdId) {
        return false
      }
      if (this.keys && !this.keys.includes(row.key)) {
        return false
      }
      return true
    })

    const data = filtered.map(({ key, enabled }) => ({ key, enabled }))

    return { data, error: null as null }
  }
}

describe("feature flag helpers", () => {
  it("returns defaults when no overrides exist", async () => {
    const supabase = createSupabaseStub([])

    const gate = await ensureFeatureEnabled({
      householdId: "household-001",
      key: "documents",
      supabase,
    })

    expect(gate.enabled).toBe(true)
  })

  it("merges overrides from the database", async () => {
    const supabase = createSupabaseStub([
      { household_id: "household-002", key: "messaging", enabled: false },
    ])

    const result = await ensureFeatureEnabled({
      householdId: "household-002",
      key: "messaging",
      supabase,
    })

    expect(result.enabled).toBe(false)
  })

  it("returns feature maps scoped to requested keys", async () => {
    const supabase = createSupabaseStub([
      { household_id: "household-003", key: "rent_payments", enabled: false },
    ])

    const keys: FeatureKey[] = ["rent_payments", "documents"]
    const { flags } = await getFeatureFlags({
      householdId: "household-003",
      keys,
      supabase,
    })

    expect(flags["rent_payments"]).toBe(false)
    expect(flags["documents"]).toBe(true)
    expect(Object.keys(flags)).toEqual(["rent_payments", "documents"])
  })
})
