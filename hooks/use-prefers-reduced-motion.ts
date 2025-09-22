import { useEffect, useState } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) {
      return
    }

    const mediaQueryList = window.matchMedia(QUERY)
    const updatePreference = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(event.matches)
    }

    updatePreference(mediaQueryList)

    const listener = (event: MediaQueryListEvent) => updatePreference(event)
    mediaQueryList.addEventListener("change", listener)

    return () => {
      mediaQueryList.removeEventListener("change", listener)
    }
  }, [])

  return prefersReducedMotion
}
