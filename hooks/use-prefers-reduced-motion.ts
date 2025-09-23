import { useEffect, useState } from "react"

export function usePrefersReducedMotion(initialValue = false) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(initialValue)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)

    updatePreference()

    const listener = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches)

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener)
      return () => mediaQuery.removeEventListener("change", listener)
    }

    mediaQuery.addListener(listener)
    return () => mediaQuery.removeListener(listener)
  }, [])

  return prefersReducedMotion
}
