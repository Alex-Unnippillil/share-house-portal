export const ACCESSIBILITY_STORAGE_KEY = "share-house-accessibility-preferences"

export type AccessibilityPreferences = {
  dyslexiaFont: boolean
  readerMode: boolean
}

export const defaultAccessibilityPreferences: AccessibilityPreferences = {
  dyslexiaFont: false,
  readerMode: false,
}

export type AccessibilityPreferenceKey = keyof AccessibilityPreferences

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const parseAccessibilityPreferences = (
  value: unknown,
): AccessibilityPreferences => {
  if (!isRecord(value)) {
    return { ...defaultAccessibilityPreferences }
  }

  return {
    dyslexiaFont:
      typeof value.dyslexiaFont === "boolean"
        ? value.dyslexiaFont
        : defaultAccessibilityPreferences.dyslexiaFont,
    readerMode:
      typeof value.readerMode === "boolean"
        ? value.readerMode
        : defaultAccessibilityPreferences.readerMode,
  }
}

export const loadAccessibilityPreferences = (
  storage: StorageLike = typeof window !== "undefined" ? window.localStorage : null,
): AccessibilityPreferences => {
  if (!storage) {
    return { ...defaultAccessibilityPreferences }
  }

  try {
    const storedValue = storage.getItem(ACCESSIBILITY_STORAGE_KEY)
    if (!storedValue) {
      return { ...defaultAccessibilityPreferences }
    }

    const parsed = JSON.parse(storedValue) as unknown
    return parseAccessibilityPreferences(parsed)
  } catch (error) {
    console.warn("Unable to parse accessibility preferences", error)
    return { ...defaultAccessibilityPreferences }
  }
}

export const persistAccessibilityPreferences = (
  preferences: AccessibilityPreferences,
  storage: StorageLike = typeof window !== "undefined" ? window.localStorage : null,
) => {
  if (!storage) {
    return
  }

  try {
    storage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.warn("Unable to persist accessibility preferences", error)
  }
}

export const applyAccessibilityPreferences = (
  preferences: AccessibilityPreferences,
  target: HTMLElement | null =
    typeof document !== "undefined" && document?.body ? document.body : null,
) => {
  if (!target) {
    return
  }

  target.classList.toggle("dyslexia-font", preferences.dyslexiaFont)
  target.classList.toggle("reader-mode", preferences.readerMode)
}
