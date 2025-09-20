import { usePreferencesStore } from "@/stores/preferences"
import { computed, onMounted } from "vue"

export function useColorMode() {
  const preferences = usePreferencesStore()

  onMounted(() => {
    preferences.hydrate()
  })

  const colorScheme = computed({
    get: () => preferences.colorScheme,
    set: (value) => preferences.setColorScheme(value),
  })

  const isDark = computed(() => {
    if (colorScheme.value === "dark") return true
    if (colorScheme.value === "light") return false

    if (typeof window === "undefined") {
      return false
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  return {
    availableColorSchemes: preferences.availableColorSchemes,
    colorScheme,
    isDark,
  }
}
