import { describe, expect, it } from "vitest"

import {
  ACCESSIBILITY_STORAGE_KEY,
  AccessibilityPreferences,
  applyAccessibilityPreferences,
  defaultAccessibilityPreferences,
  loadAccessibilityPreferences,
  persistAccessibilityPreferences,
} from "@/lib/accessibility/preferences"

type MemoryStorage = {
  store: Record<string, string>
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const createStorage = (initial: Partial<Record<string, string>> = {}): MemoryStorage => {
  const store = { ...initial }
  return {
    store,
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
  }
}

describe("accessibility preferences persistence", () => {
  it("loads stored preferences when available", () => {
    const storedValue: AccessibilityPreferences = {
      dyslexiaFont: true,
      readerMode: true,
    }
    const storage = createStorage({
      [ACCESSIBILITY_STORAGE_KEY]: JSON.stringify(storedValue),
    })

    const result = loadAccessibilityPreferences(storage)

    expect(result).toEqual(storedValue)
  })

  it("falls back to defaults when storage is empty", () => {
    const storage = createStorage()

    const result = loadAccessibilityPreferences(storage)

    expect(result).toEqual(defaultAccessibilityPreferences)
  })

  it("persists changes back to storage", () => {
    const storage = createStorage()
    const preferences: AccessibilityPreferences = {
      dyslexiaFont: true,
      readerMode: false,
    }

    persistAccessibilityPreferences(preferences, storage)

    expect(storage.store[ACCESSIBILITY_STORAGE_KEY]).toEqual(
      JSON.stringify(preferences),
    )
  })
})

describe("layout adjustments", () => {
  it("adds and removes reader and dyslexia classes on the target element", () => {
    const target = document.createElement("div")

    applyAccessibilityPreferences(
      { dyslexiaFont: true, readerMode: false },
      target,
    )

    expect(target.classList.contains("dyslexia-font")).toBe(true)
    expect(target.classList.contains("reader-mode")).toBe(false)

    applyAccessibilityPreferences(
      { dyslexiaFont: false, readerMode: true },
      target,
    )

    expect(target.classList.contains("dyslexia-font")).toBe(false)
    expect(target.classList.contains("reader-mode")).toBe(true)
  })
})
