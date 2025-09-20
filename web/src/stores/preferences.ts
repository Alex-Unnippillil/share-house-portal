import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"

const STORAGE_KEY = "share-house-portal.preferences"

type ColorScheme = "light" | "dark" | "system"
export type LocaleCode = "en" | "es"

const defaultPreferences = {
  colorScheme: "system" as ColorScheme,
  locale: "en" as LocaleCode,
}

function resolveSystemColorScheme() {
  if (typeof window === "undefined") {
    return defaultPreferences.colorScheme
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export const supportedLocales: Array<{ code: LocaleCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
]

export const usePreferencesStore = defineStore("preferences", () => {
  const colorScheme = ref<ColorScheme>(defaultPreferences.colorScheme)
  const locale = ref<LocaleCode>(defaultPreferences.locale)
  const isHydrated = ref(false)

  function persist() {
    if (typeof window === "undefined") return

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        colorScheme: colorScheme.value,
        locale: locale.value,
      })
    )
  }

  function applyDocumentLanguage(nextLocale: LocaleCode) {
    if (typeof document === "undefined") return

    document.documentElement.lang = nextLocale
  }

  function applyColorScheme(preferred: ColorScheme = colorScheme.value) {
    if (typeof document === "undefined") return

    const resolved =
      preferred === "system" ? resolveSystemColorScheme() : preferred

    document.documentElement.dataset.theme = resolved
  }

  function setColorScheme(next: ColorScheme) {
    colorScheme.value = next
    persist()
    applyColorScheme(next)
  }

  function setLocale(next: LocaleCode) {
    locale.value = next
    persist()
    applyDocumentLanguage(next)
  }

  function hydrate() {
    if (typeof window === "undefined" || isHydrated.value) {
      return
    }

    const stored = window.localStorage.getItem(STORAGE_KEY)

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<typeof defaultPreferences>

        if (
          parsed.colorScheme &&
          ["light", "dark", "system"].includes(parsed.colorScheme)
        ) {
          colorScheme.value = parsed.colorScheme as ColorScheme
        }

        if (parsed.locale && ["en", "es"].includes(parsed.locale)) {
          locale.value = parsed.locale as LocaleCode
        }
      } catch (error) {
        console.warn("Unable to parse stored preferences", error)
      }
    }

    applyDocumentLanguage(locale.value)
    applyColorScheme(colorScheme.value)

    const systemScheme = window.matchMedia("(prefers-color-scheme: dark)")
    const handleSystemChange = (event: MediaQueryListEvent) => {
      if (colorScheme.value === "system") {
        applyColorScheme(event.matches ? "dark" : "light")
      }
    }

    systemScheme.addEventListener("change", handleSystemChange)

    watch(
      () => colorScheme.value,
      (value) => {
        if (value === "system") {
          applyColorScheme("system")
        }
      }
    )

    watch(
      () => locale.value,
      (value) => {
        applyDocumentLanguage(value)
      }
    )

    isHydrated.value = true
  }

  const availableColorSchemes = computed(() => [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ])

  return {
    availableColorSchemes,
    availableLocales: supportedLocales,
    colorScheme,
    locale,
    isHydrated,
    hydrate,
    setColorScheme,
    setLocale,
  }
})
