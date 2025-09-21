import { describe, expect, it } from "vitest"

import {
  assertCanManageFloorplan,
  assertCanViewFloorplan,
  canManageFloorplan,
  canViewFloorplan,
  mergeUniqueIds,
} from "@/lib/floorplans/access"

describe("floorplan access control", () => {
  const floorplan = { buildingId: "building-1", unitId: "unit-1" }

  it("allows tenants assigned to the unit to view", () => {
    expect(
      canViewFloorplan(
        { userId: "tenant", role: "tenant", managedBuildingIds: [], unitIds: ["unit-1"] },
        floorplan,
      ),
    ).toBe(true)
  })

  it("prevents tenants from managing floorplans", () => {
    expect(
      canManageFloorplan(
        { userId: "tenant", role: "tenant", managedBuildingIds: [], unitIds: ["unit-1"] },
        floorplan,
      ),
    ).toBe(false)
  })

  it("permits property managers assigned to a building to manage floorplans", () => {
    expect(
      canManageFloorplan(
        { userId: "manager", role: "property_manager", managedBuildingIds: ["building-1"], unitIds: [] },
        floorplan,
      ),
    ).toBe(true)
  })

  it("allows admins to view and manage every floorplan", () => {
    const context = { userId: "admin", role: "admin", managedBuildingIds: [], unitIds: [] }
    expect(canViewFloorplan(context, floorplan)).toBe(true)
    expect(canManageFloorplan(context, floorplan)).toBe(true)
  })

  it("throws when asserting permissions without access", () => {
    const context = { userId: "tenant", role: "tenant", managedBuildingIds: [], unitIds: [] }
    expect(() => assertCanViewFloorplan(context, floorplan)).toThrowError()
    expect(() => assertCanManageFloorplan(context, floorplan)).toThrowError()
  })
})

describe("identifier merging", () => {
  it("deduplicates ids while preserving order", () => {
    expect(mergeUniqueIds(["a", "b"], ["b", "c", "d"]))
      .toStrictEqual(["a", "b", "c", "d"])
  })
})
