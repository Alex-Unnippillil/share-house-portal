import { describe, expect, it } from "vitest"

import { getLatestHouseRule, sortHouseRulesByVersion, type HouseRule } from "@/lib/house-rules"

function createRule(overrides: Partial<HouseRule> = {}): HouseRule {
  return {
    version: 1,
    content: "Default content",
    created_by: "00000000-0000-0000-0000-000000000000",
    published_at: "2024-01-01T12:00:00.000Z",
    ...overrides,
  }
}

describe("house rule helpers", () => {
  it("sorts rules by version in descending order", () => {
    const rules = [
      createRule({ version: 2, published_at: "2024-01-01T12:00:00.000Z" }),
      createRule({ version: 4, published_at: "2024-01-02T12:00:00.000Z" }),
      createRule({ version: 3, published_at: "2024-01-03T12:00:00.000Z" }),
    ]

    const sorted = sortHouseRulesByVersion(rules)

    expect(sorted.map((rule) => rule.version)).toEqual([4, 3, 2])
  })

  it("uses the most recent timestamp when versions match", () => {
    const rules = [
      createRule({ version: 2, published_at: "2024-01-01T09:00:00.000Z", content: "Older" }),
      createRule({ version: 2, published_at: "2024-01-01T12:00:00.000Z", content: "Newer" }),
      createRule({ version: 1, published_at: "2024-01-01T06:00:00.000Z", content: "Oldest" }),
    ]

    const sorted = sortHouseRulesByVersion(rules)

    expect(sorted[0]?.content).toBe("Newer")
  })

  it("returns null when no rules exist", () => {
    expect(getLatestHouseRule([])).toBeNull()
  })

  it("returns the highest numbered version", () => {
    const rules = [
      createRule({ version: 5, published_at: "2024-02-01T12:00:00.000Z" }),
      createRule({ version: 3, published_at: "2024-01-01T12:00:00.000Z" }),
    ]

    expect(getLatestHouseRule(rules)?.version).toBe(5)
  })
})
