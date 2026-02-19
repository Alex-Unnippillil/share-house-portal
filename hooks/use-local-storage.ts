"use client"

import { useEffect, useState } from "react"

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      const storedValue = window.localStorage.getItem(key)
      if (storedValue !== null) {
        setValue(JSON.parse(storedValue) as T)
      }
    } catch {
      setValue(initialValue)
    }
  }, [initialValue, key])

  const setStoredValue = (nextValue: T) => {
    setValue(nextValue)

    if (typeof window === "undefined") {
      return
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(nextValue))
    } catch {
      // Ignore write failures and keep in-memory state.
    }
  }

  return [value, setStoredValue] as const
}
