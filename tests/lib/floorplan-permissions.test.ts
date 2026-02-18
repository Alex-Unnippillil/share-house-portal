import { describe, expect, it } from "vitest"

import {
  canEditAnnotation,
  filterVisibleAnnotations,
  getAllowedMarkerTypes,
  type FloorplanAnnotation,
} from "@/lib/floorplan-permissions"

const baseAnnotation: FloorplanAnnotation = {
  id: "annotation-1",
  markerType: "storage",
  label: "Shelf",
  note: null,
  x: 20,
  y: 30,
  createdBy: "user-1",
  visibleToUserIds: [],
  visibilityScope: "all_roommates",
  version: 1,
  updatedAt: new Date().toISOString(),
}

describe("floorplan permission helpers", () => {
  it("returns marker permissions by role", () => {
    expect(getAllowedMarkerTypes("roommate")).toEqual(["storage", "chore"])
    expect(getAllowedMarkerTypes("admin")).toEqual(["room", "storage", "chore"])
  })

  it("only allows authors to edit unless manager role", () => {
    expect(canEditAnnotation(baseAnnotation, "roommate", "user-2")).toBe(false)
    expect(canEditAnnotation(baseAnnotation, "roommate", "user-1")).toBe(true)
    expect(canEditAnnotation(baseAnnotation, "property_manager", "user-2")).toBe(true)
  })

  it("filters visibility for private and selected scopes", () => {
    const annotations: FloorplanAnnotation[] = [
      baseAnnotation,
      {
        ...baseAnnotation,
        id: "annotation-private",
        visibilityScope: "private",
      },
      {
        ...baseAnnotation,
        id: "annotation-selected",
        visibilityScope: "selected_roommates",
        visibleToUserIds: ["user-2"],
      },
    ]

    const visibleToUser2 = filterVisibleAnnotations(annotations, "user-2").map((annotation) => annotation.id)
    expect(visibleToUser2).toEqual(["annotation-1", "annotation-selected"])

    const visibleToOwner = filterVisibleAnnotations(annotations, "user-1").map((annotation) => annotation.id)
    expect(visibleToOwner).toEqual(["annotation-1", "annotation-private"])
  })
})
