import { describe, expect, it } from "vitest"

import {
  clampNormalized,
  fromNormalizedPoint,
  parseNormalizedPolygon,
  serializeNormalizedPolygon,
  toNormalizedPoint,
} from "@/lib/floorplan-geometry"

import type { NormalizedPoint } from "@/lib/schemas/overlay-shape"

describe("floorplan geometry helpers", () => {
  it("converts absolute coordinates to normalized ratios", () => {
    const point = toNormalizedPoint(50, 75, 200, 150)
    expect(point).toEqual({ x: 0.25, y: 0.5 })
  })

  it("clamps normalized coordinates within bounds", () => {
    expect(clampNormalized(-0.3)).toBe(0)
    expect(clampNormalized(0.5)).toBe(0.5)
    expect(clampNormalized(4)).toBe(1)
  })

  it("rounds and validates polygons before serialization", () => {
    const polygon: NormalizedPoint[] = [
      { x: 0, y: 0 },
      { x: 0.3333333, y: 0.5 },
      { x: 0.8, y: 1 },
    ]

    const serialized = serializeNormalizedPolygon(polygon, 3)
    expect(serialized).toEqual([
      { x: 0, y: 0 },
      { x: 0.333, y: 0.5 },
      { x: 0.8, y: 1 },
    ])
  })

  it("throws when attempting to serialize invalid polygons", () => {
    expect(() => serializeNormalizedPolygon([], 2)).toThrow()
    expect(() => serializeNormalizedPolygon([{ x: 0, y: 0 }])).toThrow()
    expect(() => serializeNormalizedPolygon([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toThrow()
  })

  it("parses polygon payloads and clamps coordinates", () => {
    const input = [
      { x: 1.2, y: -0.2 },
      { x: 0.5, y: 0.5 },
      { x: 0.9, y: 0.9 },
    ]

    const parsed = parseNormalizedPolygon(input)
    expect(parsed).toEqual([
      { x: 1, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 0.9, y: 0.9 },
    ])
  })

  it("translates normalized points back to absolute coordinates", () => {
    const result = fromNormalizedPoint({ x: 0.5, y: 0.25 }, 400, 200)
    expect(result).toEqual({ x: 200, y: 50 })
  })
})
