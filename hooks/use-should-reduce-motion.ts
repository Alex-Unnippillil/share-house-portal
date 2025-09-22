"use client"

import { useSyncExternalStore } from "react"

const MEDIA_QUERY = "(prefers-reduced-motion: reduce)"

type StoreSubscriber = () => void

const getSnapshot = () => {
  if (typeof window === "undefined") {
    return true
  }

  return window.matchMedia(MEDIA_QUERY).matches
}

const subscribe = (callback: StoreSubscriber) => {
  if (typeof window === "undefined") {
    return () => {}
  }

  const mediaQueryList = window.matchMedia(MEDIA_QUERY)

  const listener = () => callback()

  if (typeof mediaQueryList.addEventListener === "function") {
    mediaQueryList.addEventListener("change", listener)
  } else {
    mediaQueryList.addListener(listener)
  }

  return () => {
    if (typeof mediaQueryList.removeEventListener === "function") {
      mediaQueryList.removeEventListener("change", listener)
    } else {
      mediaQueryList.removeListener(listener)
    }
  }
}

/**
 * Returns whether the current environment requests reduced motion. The hook uses
 * `useSyncExternalStore` so that we can synchronously read the media query
 * during rendering and avoid playing animations on the first paint when a user
 * prefers reduced motion.
 */
export function useShouldReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
