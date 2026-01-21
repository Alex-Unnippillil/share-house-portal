"use client"

import { useCallback, useEffect, useRef } from "react"

import { useSessionTimeout } from "@/hooks/use-session-timeout"

interface UseSessionAutoSaveOptions<T> {
  storageKey: string
  getValues: () => T
  onRestore?: (values: Partial<T>) => void
}

export function useSessionAutoSave<T>({
  storageKey,
  getValues,
  onRestore,
}: UseSessionAutoSaveOptions<T>) {
  const { registerAutoSaveCallback } = useSessionTimeout()
  const latestGetValues = useRef(getValues)
  const latestOnRestore = useRef(onRestore)

  useEffect(() => {
    latestGetValues.current = getValues
  }, [getValues])

  useEffect(() => {
    latestOnRestore.current = onRestore
  }, [onRestore])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const draft = window.localStorage.getItem(storageKey)
    if (!draft) {
      return
    }

    try {
      const parsed = JSON.parse(draft) as Partial<T>
      latestOnRestore.current?.(parsed)
    } catch (error) {
      console.warn("Failed to restore form draft", error)
    }
  }, [storageKey])

  useEffect(() => {
    return registerAutoSaveCallback(async () => {
      if (typeof window === "undefined") {
        return
      }

      try {
        const values = latestGetValues.current()
        window.localStorage.setItem(storageKey, JSON.stringify(values))
      } catch (error) {
        console.warn("Failed to persist form draft", error)
      }
    })
  }, [registerAutoSaveCallback, storageKey])

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }

    window.localStorage.removeItem(storageKey)
  }, [storageKey])

  return { clearDraft }
}
