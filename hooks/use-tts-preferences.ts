"use client"

import { useMemo } from "react"

import { useLocalStorage } from "@/lib/hooks/use-local-storage"
import {
  DEFAULT_TTS_PREFERENCES,
  TTS_PREFERENCE_STORAGE_KEY,
  getResolvedTtsPreferences,
  type TtsPreferences,
} from "@/lib/settings/tts"

export const useTtsPreferences = () => {
  const [storedPreferences, setStoredPreferences] = useLocalStorage<TtsPreferences>(
    TTS_PREFERENCE_STORAGE_KEY,
    DEFAULT_TTS_PREFERENCES,
  )

  const preferences = useMemo(() => getResolvedTtsPreferences(storedPreferences), [storedPreferences])

  return {
    preferences,
    setPreferences: setStoredPreferences,
  }
}
