"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type {
  AccessibilityPreferenceKey,
  AccessibilityPreferences,
} from "@/lib/accessibility/preferences"
import {
  applyAccessibilityPreferences,
  defaultAccessibilityPreferences,
  loadAccessibilityPreferences,
  persistAccessibilityPreferences,
} from "@/lib/accessibility/preferences"

type AccessibilityContextValue = {
  preferences: AccessibilityPreferences
  dyslexiaFont: boolean
  readerMode: boolean
  isHydrated: boolean
  setPreference: (key: AccessibilityPreferenceKey, value: boolean) => void
  togglePreference: (key: AccessibilityPreferenceKey) => void
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(
    () => defaultAccessibilityPreferences,
  )
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const stored = loadAccessibilityPreferences()
    setPreferences(stored)
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    persistAccessibilityPreferences(preferences)
    applyAccessibilityPreferences(preferences)
  }, [isHydrated, preferences])

  const setPreference = useCallback((key: AccessibilityPreferenceKey, value: boolean) => {
    setPreferences((previous) => ({ ...previous, [key]: value }))
  }, [])

  const togglePreference = useCallback((key: AccessibilityPreferenceKey) => {
    setPreferences((previous) => ({ ...previous, [key]: !previous[key] }))
  }, [])

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      preferences,
      dyslexiaFont: preferences.dyslexiaFont,
      readerMode: preferences.readerMode,
      isHydrated,
      setPreference,
      togglePreference,
    }),
    [isHydrated, preferences, setPreference, togglePreference],
  )

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext)

  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider")
  }

  return context
}
