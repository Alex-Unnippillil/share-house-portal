import { describe, expect, it } from "vitest"

import {
  FLOORPLAN_PREFERENCES_STORAGE_KEY,
  PAN_RANGE,
  ZOOM_RANGE,
  createDefaultFloorplanPreferences,
  readFloorplanPreferences,
  sanitizeFloorplanPreferences,
  writeFloorplanPreferences,
} from "@/hooks/use-floorplan-preferences"

class MemoryStorage {
  private store = new Map<string, string>()

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  setItem(key: string, value: string) {
    this.store.set(key, value)
  }

  removeItem(key: string) {
    this.store.delete(key)
  }
}

describe("floorplan preference persistence", () => {
  it("returns defaults when no stored preferences exist", () => {
    const storage = new MemoryStorage()
    expect(readFloorplanPreferences(storage)).toEqual(createDefaultFloorplanPreferences())
  })

  it("persists zoom and pan values for subsequent sessions", () => {
    const storage = new MemoryStorage()
    const preferences = {
      zoom: 1.75,
      pan: { x: 48, y: -24 },
    }

    writeFloorplanPreferences(preferences, storage)
    expect(readFloorplanPreferences(storage)).toEqual(preferences)
  })

  it("clamps zoom and pan within supported ranges", () => {
    const storage = new MemoryStorage()
    const outOfRange = {
      zoom: ZOOM_RANGE.max + 5,
      pan: { x: PAN_RANGE + 420, y: -PAN_RANGE - 500 },
    }

    writeFloorplanPreferences(outOfRange, storage)
    const persisted = readFloorplanPreferences(storage)

    expect(persisted.zoom).toBe(ZOOM_RANGE.max)
    expect(persisted.pan.x).toBe(PAN_RANGE)
    expect(persisted.pan.y).toBe(-PAN_RANGE)
  })

  it("recovers from corrupted storage entries", () => {
    const storage = new MemoryStorage()
    storage.setItem(FLOORPLAN_PREFERENCES_STORAGE_KEY, "{not-valid-json}")

    expect(readFloorplanPreferences(storage)).toEqual(createDefaultFloorplanPreferences())
  })

  it("sanitises malformed inputs before persistence", () => {
    const malformed = sanitizeFloorplanPreferences({
      zoom: "abc" as unknown as number,
      pan: {
        x: "200px" as unknown as number,
        y: null as unknown as number,
      },
    })

    expect(malformed).toEqual(createDefaultFloorplanPreferences())
  })
})
