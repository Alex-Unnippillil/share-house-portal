export interface TtsPreferences {
  voiceURI: string | null
  rate: number
}

export const DEFAULT_TTS_PREFERENCES: TtsPreferences = {
  voiceURI: null,
  rate: 1,
}

export const TTS_PREFERENCE_STORAGE_KEY = "roomsily-tts-preferences"

export const getResolvedTtsPreferences = (
  preferences: Partial<TtsPreferences> | null | undefined,
): TtsPreferences => {
  return {
    voiceURI: typeof preferences?.voiceURI === "string" ? preferences.voiceURI : null,
    rate: typeof preferences?.rate === "number" && preferences.rate > 0 ? preferences.rate : 1,
  }
}
