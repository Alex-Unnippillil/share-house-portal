import { describe, expect, it } from "vitest"

import {
  buildAnnotationTypeSet,
  canManageBuilding,
  canManageFloorplan,
  canViewFloorplan,
  collectMembershipSummary,
  filterAnnotationsByRoommate,
  filterAnnotationsByTypes,
  normalizeGeometry,
  type FloorplanRow,
  type MembershipSummary,
} from "@/lib/floorplans/access"

const mockFloorplan = (overrides: Partial<FloorplanRow> = {}) => ({
  building_id: "building-1",
  created_at: null,
  created_by: null,
  description: null,
  id: "floorplan-1",
  media_type: "image/png",
  name: "Main Floor",
  storage_path: "path",
  unit_id: "unit-1",
  updated_at: null,
  ...overrides,
})

describe("membership summary", () => {
  it("collects unique unit and building identifiers", () => {
    const summary = collectMembershipSummary([
      { unit_id: "unit-1", unit: { building_id: "building-1" } },
      { unit_id: "unit-2", unit: { building_id: "building-1" } },
      { unit_id: "unit-1", unit: { building_id: "building-1" } },
      { unit_id: "unit-3", unit: { building_id: "building-2" } },
    ])

    expect(summary.unitIds.sort()).toEqual(["unit-1", "unit-2", "unit-3"].sort())
    expect(summary.buildingIds.sort()).toEqual(["building-1", "building-2"].sort())
  })
})

describe("management permissions", () => {
  it("allows admins to manage any building", () => {
    expect(canManageBuilding("admin", "building-1", [])).toBe(true)
  })

  it("allows property managers for assigned buildings", () => {
    expect(canManageBuilding("property_manager", "building-2", ["building-2"]))
      .toBe(true)
    expect(canManageBuilding("property_manager", "building-3", ["building-2"]))
      .toBe(false)
  })

  it("evaluates floorplan permissions", () => {
    const floorplan = mockFloorplan({ building_id: "building-2" })
    expect(canManageFloorplan("admin", floorplan, [])).toBe(true)
    expect(canManageFloorplan("property_manager", floorplan, ["building-2"])).toBe(true)
    expect(canManageFloorplan("property_manager", floorplan, ["building-1"])).toBe(false)
  })
})

describe("view permissions", () => {
  const membershipSummary: MembershipSummary = {
    unitIds: ["unit-1"],
    buildingIds: ["building-1"],
  }

  it("allows tenants to view their unit floorplans", () => {
    const floorplan = mockFloorplan()
    expect(
      canViewFloorplan("tenant", floorplan, membershipSummary, [])
    ).toBe(true)
  })

  it("prevents tenants from other buildings", () => {
    const floorplan = mockFloorplan({ unit_id: "unit-2", building_id: "building-2" })
    expect(
      canViewFloorplan("tenant", floorplan, membershipSummary, [])
    ).toBe(false)
  })

  it("allows building-wide floorplans for the same building", () => {
    const floorplan = mockFloorplan({ unit_id: null, building_id: "building-1" })
    expect(
      canViewFloorplan("roommate", floorplan, membershipSummary, [])
    ).toBe(true)
  })
})

describe("geometry normalisation", () => {
  it("normalises rectangle geometry", () => {
    const geometry = normalizeGeometry({ type: "rect", x: 1.2, y: -0.5, width: 0.4, height: 0.6 })
    expect(geometry).toEqual({ type: "rect", x: 1, y: 0, width: 0.4, height: 0.6 })
  })

  it("rejects invalid geometry", () => {
    expect(normalizeGeometry(null)).toBeNull()
    expect(normalizeGeometry({})).toBeNull()
    expect(normalizeGeometry({ type: "rect" })).toBeNull()
  })
})

describe("annotation helpers", () => {
  const annotations = [
    { annotation_type: "storage", profile_id: "a" },
    { annotation_type: "note", profile_id: "b" },
    { annotation_type: "chore", profile_id: null },
  ] as const

  it("builds annotation type sets", () => {
    const typeSet = buildAnnotationTypeSet(Array.from(annotations))
    expect(Array.from(typeSet).sort()).toEqual(["storage", "note", "chore"].sort())
  })

  it("filters by roommate", () => {
    expect(filterAnnotationsByRoommate(Array.from(annotations), "all").length).toBe(3)
    expect(filterAnnotationsByRoommate(Array.from(annotations), "a").length).toBe(1)
    expect(filterAnnotationsByRoommate(Array.from(annotations), "unassigned").length).toBe(1)
  })

  it("filters by type set", () => {
    const visible = filterAnnotationsByTypes(Array.from(annotations), new Set(["storage", "chore"]))
    expect(visible.length).toBe(2)

    const none = filterAnnotationsByTypes(Array.from(annotations), new Set())
    expect(none).toEqual([])
  })
})
