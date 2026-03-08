import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const migrationPath = resolve(
  __dirname,
  "../supabase/migrations/20250116_compound_indexes.sql",
)

const migrationSql = readFileSync(migrationPath, "utf8")

const expectedIndexStatements = [
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_member_households_building_member",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_member_households_building_household",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chore_assignments_building_assigned_status_due",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chore_assignments_building_household_due",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_building_tenant_status_due",
  "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_building_household_due",
]

describe("supabase compound index migration", () => {
  it("is marked as non-transactional for concurrent index creation", () => {
    expect(migrationSql.startsWith("-- disable-transaction"))
      .toBe(true)
  })

  it("includes all expected compound index statements", () => {
    for (const statement of expectedIndexStatements) {
      expect(migrationSql).toContain(statement)
    }
  })
})
