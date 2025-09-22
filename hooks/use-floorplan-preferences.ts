import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export interface FloorplanPreferences {
  zoom: number
  pan: {
    x: number
    y: number
  }
}

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">

export const FLOORPLAN_PREFERENCES_STORAGE_KEY = "share-house-portal:floorplan-preferences"

export const ZOOM_RANGE = {
  min: 0.75,
  max: 2.5,
}

export const PAN_RANGE = 200

const basePreferences: FloorplanPreferences = {
  zoom: 1,
  pan: { x: 0, y: 0 },
}

export const defaultFloorplanPreferences: FloorplanPreferences = {
  zoom: basePreferences.zoom,
  pan: { ...basePreferences.pan },
}

export const createDefaultFloorplanPreferences = (): FloorplanPreferences => ({
  zoom: basePreferences.zoom,
  pan: { ...basePreferences.pan },
})

const clampNumber = (value: unknown, min: number, max: number, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(max, Math.max(min, value))
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.min(max, Math.max(min, parsed))
    }
  }

  return fallback
}

export const sanitizeFloorplanPreferences = (
  candidate: Partial<FloorplanPreferences> | null | undefined
): FloorplanPreferences => {
  const fallback = createDefaultFloorplanPreferences()
  if (!candidate || typeof candidate !== "object") {
    return fallback
  }

  const zoom = clampNumber(candidate.zoom, ZOOM_RANGE.min, ZOOM_RANGE.max, fallback.zoom)
  const panX = clampNumber(candidate.pan?.x, -PAN_RANGE, PAN_RANGE, fallback.pan.x)
  const panY = clampNumber(candidate.pan?.y, -PAN_RANGE, PAN_RANGE, fallback.pan.y)

  return {
    zoom,
    pan: { x: panX, y: panY },
  }
}

export const readFloorplanPreferences = (storage?: StorageLike | null): FloorplanPreferences => {
  if (!storage) {
    return createDefaultFloorplanPreferences()
  }

  try {
    const rawValue = storage.getItem(FLOORPLAN_PREFERENCES_STORAGE_KEY)
    if (!rawValue) {
      return createDefaultFloorplanPreferences()
    }

    const parsed = JSON.parse(rawValue) as Partial<FloorplanPreferences> | null
    return sanitizeFloorplanPreferences(parsed ?? undefined)
  } catch (error) {
    console.warn("Unable to read floorplan preferences", error)
    return createDefaultFloorplanPreferences()
  }
}

export const writeFloorplanPreferences = (
  preferences: FloorplanPreferences,
  storage?: StorageLike | null
) => {
  if (!storage) return

  const safePreferences = sanitizeFloorplanPreferences(preferences)
  storage.setItem(FLOORPLAN_PREFERENCES_STORAGE_KEY, JSON.stringify(safePreferences))
}

export const clearFloorplanPreferences = (storage?: StorageLike | null) => {
  storage?.removeItem(FLOORPLAN_PREFERENCES_STORAGE_KEY)
}

export const useFloorplanPreferences = (storage?: StorageLike | null) => {
  const storageRef = useRef<StorageLike | null | undefined>(storage)
  const [preferences, setInternalPreferences] = useState<FloorplanPreferences>(createDefaultFloorplanPreferences)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const resolvedStorage = storageRef.current ?? window.localStorage
    storageRef.current = resolvedStorage

    const initial = readFloorplanPreferences(resolvedStorage)
    setInternalPreferences(initial)
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    const resolvedStorage = storageRef.current
    if (!resolvedStorage) return

    writeFloorplanPreferences(preferences, resolvedStorage)
  }, [preferences, isHydrated])

  const setPreferences = useCallback<React.Dispatch<React.SetStateAction<FloorplanPreferences>>>(
    (update) => {
      setInternalPreferences((previous) => {
        const nextValue = typeof update === "function" ? update(previous) : update
        return sanitizeFloorplanPreferences(nextValue)
      })
    },
    []
  )

  const reset = useCallback(() => {
    setPreferences(() => createDefaultFloorplanPreferences())
  }, [setPreferences])

  return useMemo(
    () => ({
      preferences,
      setPreferences,
      reset,
      isHydrated,
    }),
    [preferences, setPreferences, reset, isHydrated]
  )
}
