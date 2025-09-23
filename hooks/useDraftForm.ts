"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import type { UseFormReturn } from "react-hook-form"

import { useAuth } from "@/hooks/use-auth"
import type { Json } from "@/lib/supabase"
import { createClient } from "@/utils/supabase-browser"

type ToastFunction = (props: { title?: ReactNode; description?: ReactNode; action?: ReactNode }) => void

interface DraftRecord<TData> {
  data: TData
  updatedAt: string
}

type SerializeFn<TValues> = (values: TValues) => Record<string, unknown>

type DeserializeFn<TValues> = (values: Record<string, unknown>) => Partial<TValues>

export interface UseDraftFormOptions<TValues extends Record<string, unknown>> {
  values: TValues
  form?: UseFormReturn<TValues>
  /**
   * Optional debounce override for persisting values. Defaults to 3 seconds.
   */
  debounceMs?: number
  /**
   * Override the default route-derived storage key.
   */
  storageKey?: string
  /**
   * Optional serialization transform prior to persistence.
   */
  serialize?: SerializeFn<TValues>
  /**
   * Optional deserialization transform when hydrating drafts.
   */
  deserialize?: DeserializeFn<TValues>
  /**
   * Custom hydrate handler. Defaults to calling form.reset when a form instance is supplied.
   */
  onHydrate?: (values: Partial<TValues>) => void
  /**
   * Provide the toast helper so the hook can surface restoration UX.
   */
  toast?: ToastFunction
  /**
   * Disable persistence entirely (useful for tests or conditional flows).
   */
  enabled?: boolean
}

interface UseDraftFormReturn {
  clearDraft: () => Promise<void>
  restoreDraft: () => Promise<void>
  lastSavedAt: Date | null
  hasDraft: boolean
}

const DEFAULT_DEBOUNCE = 3000

export function useDraftForm<TValues extends Record<string, unknown>>({
  values,
  form,
  debounceMs = DEFAULT_DEBOUNCE,
  storageKey,
  serialize,
  deserialize,
  onHydrate,
  toast,
  enabled = true,
}: UseDraftFormOptions<TValues>): UseDraftFormReturn {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])

  const latestValuesRef = useRef(values)
  const serializedRef = useRef<string | null>(null)
  const skipNextSaveRef = useRef(false)
  const initializedRef = useRef(false)

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [hasDraft, setHasDraft] = useState(false)

  latestValuesRef.current = values

  const resolvedKey = useMemo(() => {
    const routeKey = storageKey ?? pathname ?? "root"
    const userKey = user?.id ?? "anon"
    return `draft:${userKey}:${routeKey}`
  }, [pathname, storageKey, user?.id])

  const supabaseRouteKey = useMemo(() => storageKey ?? pathname ?? "root", [pathname, storageKey])

  const serializeValues = useCallback((): Record<string, unknown> => {
    const raw = latestValuesRef.current
    return serialize ? serialize(raw) : (raw as Record<string, unknown>)
  }, [serialize])

  const applyHydratedValues = useCallback(
    (draft: Partial<TValues>) => {
      if (!draft || Object.keys(draft).length === 0) {
        return
      }

      if (onHydrate) {
        onHydrate(draft)
        return
      }

      if (form) {
        form.reset({ ...form.getValues(), ...draft })
      }
    },
    [form, onHydrate],
  )

  const readFromStorage = useCallback(async (): Promise<DraftRecord<Record<string, unknown>> | null> => {
    if (!enabled) {
      return null
    }

    if (user) {
      const { data, error } = await (supabase as any)
        .from("drafts")
        .select("data, updated_at")
        .eq("user_id", user.id)
        .eq("route", supabaseRouteKey)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        return null
      }

      return {
        data: (data.data ?? {}) as Record<string, unknown>,
        updatedAt: data.updated_at ?? new Date().toISOString(),
      }
    }

    if (typeof window === "undefined") {
      return null
    }

    const raw = window.localStorage.getItem(resolvedKey)

    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw) as DraftRecord<Record<string, unknown>>
      if (parsed?.data && typeof parsed === "object") {
        return parsed
      }
    } catch (error) {
      console.warn("Failed to parse draft from storage", error)
    }

    return null
  }, [enabled, resolvedKey, supabase, supabaseRouteKey, user])

  const persistToStorage = useCallback(
    async (snapshot: Record<string, unknown>) => {
      const payload: DraftRecord<Record<string, unknown>> = {
        data: snapshot,
        updatedAt: new Date().toISOString(),
      }

      if (user) {
        await (supabase as any)
          .from("drafts")
          .upsert(
            {
              user_id: user.id,
              route: supabaseRouteKey,
              data: payload.data as Json,
              updated_at: payload.updatedAt,
            },
            { onConflict: "user_id,route" },
          )
        return
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(resolvedKey, JSON.stringify(payload))
      }
    },
    [resolvedKey, supabase, supabaseRouteKey, user],
  )

  const clearStorage = useCallback(async () => {
    if (user) {
      await (supabase as any)
        .from("drafts")
        .delete()
        .eq("user_id", user.id)
        .eq("route", supabaseRouteKey)
      return
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(resolvedKey)
    }
  }, [resolvedKey, supabase, supabaseRouteKey, user])

  const restoreDraft = useCallback(async () => {
    const stored = await readFromStorage()
    if (!stored) {
      initializedRef.current = true
      return
    }

    const hydrated = deserialize ? deserialize(stored.data) : (stored.data as Partial<TValues>)
    applyHydratedValues(hydrated)
    serializedRef.current = JSON.stringify(stored.data)
    setLastSavedAt(new Date(stored.updatedAt))
    setHasDraft(true)
    skipNextSaveRef.current = true
    initializedRef.current = true

    toast?.({
      title: "Restore draft",
      description: "We restored your latest saved progress.",
    })
  }, [applyHydratedValues, deserialize, readFromStorage, toast])

  useEffect(() => {
    if (!enabled || loading || initializedRef.current) {
      return
    }

    void restoreDraft().then(() => {
      initializedRef.current = true
    })
  }, [enabled, loading, restoreDraft])

  useEffect(() => {
    if (!enabled || loading) {
      return
    }

    if (!initializedRef.current) {
      return
    }

    const snapshot = serializeValues()
    const serialized = JSON.stringify(snapshot)

    if (serialized === serializedRef.current || skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }

    const timer = window.setTimeout(() => {
      void persistToStorage(snapshot).then(() => {
        serializedRef.current = serialized
        setLastSavedAt(new Date())
        setHasDraft(true)
      })
    }, debounceMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [debounceMs, enabled, loading, persistToStorage, serializeValues, values])

  const clearDraft = useCallback(async () => {
    skipNextSaveRef.current = true
    serializedRef.current = null
    setHasDraft(false)
    setLastSavedAt(null)
    await clearStorage()
  }, [clearStorage])

  return {
    clearDraft,
    restoreDraft,
    lastSavedAt,
    hasDraft,
  }
}
