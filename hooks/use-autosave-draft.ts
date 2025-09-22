"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import useSupabaseBrowser from "@/utils/supabase-browser"
import {
  deleteDraftFromIndexedDb,
  readDraftFromIndexedDb,
  writeDraftToIndexedDb,
  type IndexedDraftRecord,
} from "@/utils/indexeddb"

export type AutosaveStorageProvider = "supabase" | "indexeddb"
export type AutosaveStatus = "idle" | "saving" | "saved" | "error"

const DEFAULT_THROTTLE_MS = 1500
const DEFAULT_EXPIRY_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

type SerializeFn<T, TSerialized> = ((data: T) => TSerialized) | undefined
type DeserializeFn<T, TSerialized> = ((data: TSerialized) => Partial<T>) | undefined

export interface UseAutosaveDraftOptions<T, TSerialized = T> {
  storage?: AutosaveStorageProvider
  throttleMs?: number
  enabled?: boolean
  expireMs?: number
  isDirty?: boolean
  serialize?: (data: T) => TSerialized
  deserialize?: (data: TSerialized) => Partial<T>
}

export interface UseAutosaveDraftResult<T> {
  status: AutosaveStatus
  lastSavedAt: Date | null
  lastError: string | null
  hasDraft: boolean
  isLoadingDraft: boolean
  resolvedStorage: AutosaveStorageProvider
  clearDraft: () => Promise<void>
  resumeDraft: () => Promise<Partial<T> | null>
}

export function useAutosaveDraft<T, TSerialized = T>(
  formKey: string,
  data: T,
  options: UseAutosaveDraftOptions<T, TSerialized> = {},
): UseAutosaveDraftResult<T> {
  const supabase = useSupabaseBrowser()
  const preferredStorage = options.storage ?? "supabase"
  const throttleMs = options.throttleMs ?? DEFAULT_THROTTLE_MS
  const expireMs = options.expireMs ?? DEFAULT_EXPIRY_MS
  const enabled = options.enabled ?? true
  const canSave = enabled && (options.isDirty ?? true)

  const serializeRef = useRef<SerializeFn<T, TSerialized>>(options.serialize)
  const deserializeRef = useRef<DeserializeFn<T, TSerialized>>(options.deserialize)

  useEffect(() => {
    serializeRef.current = options.serialize
  }, [options.serialize])

  useEffect(() => {
    deserializeRef.current = options.deserialize
  }, [options.deserialize])

  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(preferredStorage !== "supabase")
  const [status, setStatus] = useState<AutosaveStatus>("idle")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [isLoadingDraft, setIsLoadingDraft] = useState(true)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedSnapshotRef = useRef<string>("")
  const draftRef = useRef<Partial<T> | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (preferredStorage !== "supabase") {
      return
    }

    let isActive = true

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!isActive || !isMountedRef.current) {
          return
        }
        setUserId(data.user?.id ?? null)
        setAuthChecked(true)
      })
      .catch(() => {
        if (!isActive || !isMountedRef.current) {
          return
        }
        setUserId(null)
        setAuthChecked(true)
      })

    return () => {
      isActive = false
    }
  }, [preferredStorage, supabase])

  const resolvedStorage: AutosaveStorageProvider = useMemo(() => {
    if (preferredStorage === "supabase") {
      if (userId) {
        return "supabase"
      }
      if (authChecked) {
        return "indexeddb"
      }
    }

    return preferredStorage === "indexeddb" ? "indexeddb" : "supabase"
  }, [authChecked, preferredStorage, userId])

  const resetDraftState = useCallback(() => {
    draftRef.current = null
    lastSavedSnapshotRef.current = ""
    if (!isMountedRef.current) {
      return
    }
    setHasDraft(false)
    setLastSavedAt(null)
  }, [])

  const loadDraft = useCallback(async (): Promise<Partial<T> | null> => {
    if (!enabled) {
      if (isMountedRef.current) {
        setIsLoadingDraft(false)
      }
      return null
    }

    if (resolvedStorage === "supabase" && !userId) {
      return null
    }

    if (isMountedRef.current) {
      setIsLoadingDraft(true)
    }

    try {
      if (resolvedStorage === "supabase") {
        const { data: draft, error } = await supabase
          .from("form_drafts")
          .select("payload, updated_at, expires_at")
          .eq("user_id", userId as string)
          .eq("form_key", formKey)
          .maybeSingle()

        if (error) {
          throw error
        }

        if (!draft) {
          resetDraftState()
          return null
        }

        const isExpired = Boolean(
          draft.expires_at && new Date(draft.expires_at).getTime() < Date.now(),
        )

        if (isExpired) {
          await supabase
            .from("form_drafts")
            .delete()
            .eq("user_id", userId as string)
            .eq("form_key", formKey)
          resetDraftState()
          return null
        }

        const serializedString = JSON.stringify(draft.payload ?? {})
        lastSavedSnapshotRef.current = serializedString

        const parsed = deserializeRef.current
          ? deserializeRef.current(draft.payload as TSerialized)
          : ((draft.payload as unknown) as Partial<T>)

        draftRef.current = parsed
        if (isMountedRef.current) {
          setHasDraft(true)
          setLastSavedAt(draft.updated_at ? new Date(draft.updated_at) : new Date())
        }
        return parsed
      }

      const record = await readDraftFromIndexedDb<TSerialized>(formKey)

      if (!record) {
        resetDraftState()
        return null
      }

      const isExpired = Boolean(
        record.expiresAt && new Date(record.expiresAt).getTime() < Date.now(),
      )

      if (isExpired) {
        await deleteDraftFromIndexedDb(formKey)
        resetDraftState()
        return null
      }

      const serializedString = JSON.stringify(record.payload ?? {})
      lastSavedSnapshotRef.current = serializedString

      const parsed = deserializeRef.current
        ? deserializeRef.current(record.payload as TSerialized)
        : ((record.payload as unknown) as Partial<T>)

      draftRef.current = parsed
      if (isMountedRef.current) {
        setHasDraft(true)
        setLastSavedAt(record.updatedAt ? new Date(record.updatedAt) : new Date())
      }
      return parsed
    } catch (error) {
      console.error("Failed to load form draft", error)
      if (isMountedRef.current) {
        setLastError(error instanceof Error ? error.message : "Unable to load draft")
      }
      return null
    } finally {
      if (isMountedRef.current) {
        setIsLoadingDraft(false)
      }
    }
  }, [enabled, formKey, resolvedStorage, resetDraftState, supabase, userId])

  useEffect(() => {
    if (!enabled) {
      if (isMountedRef.current) {
        setIsLoadingDraft(false)
      }
      return
    }

    if (resolvedStorage === "supabase" && !userId) {
      return
    }

    void loadDraft()
  }, [enabled, loadDraft, resolvedStorage, userId])

  useEffect(() => {
    if (!canSave) {
      if (status !== "idle" && isMountedRef.current) {
        setStatus("idle")
      }
      return
    }

    if (resolvedStorage === "supabase" && !userId) {
      return
    }

    if (isLoadingDraft) {
      return
    }

    const serializeFn = serializeRef.current
    const serializedPayload = serializeFn ? serializeFn(data) : ((data as unknown) as TSerialized)

    let serializedSnapshot: string
    try {
      serializedSnapshot = JSON.stringify(serializedPayload ?? {})
    } catch (error) {
      console.error("Failed to serialise form draft", error)
      if (isMountedRef.current) {
        setStatus("error")
        setLastError(error instanceof Error ? error.message : "Unable to serialise form data")
      }
      return
    }

    if (serializedSnapshot === lastSavedSnapshotRef.current) {
      return
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    if (isMountedRef.current) {
      setStatus("saving")
      setLastError(null)
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null

      const persistDraft = async () => {
        if (!isMountedRef.current) {
          return
        }

        if (resolvedStorage === "supabase") {
          if (!userId) {
            return
          }

          try {
            const expiresAtIso = new Date(Date.now() + expireMs).toISOString()
            const { error } = await supabase
              .from("form_drafts")
              .upsert(
                {
                  user_id: userId,
                  form_key: formKey,
                  payload: serializedPayload,
                  expires_at: expiresAtIso,
                },
                { onConflict: "user_id,form_key" },
              )

            if (error) {
              throw error
            }

            const parsed = deserializeRef.current
              ? deserializeRef.current(serializedPayload)
              : ((serializedPayload as unknown) as Partial<T>)

            draftRef.current = parsed
            lastSavedSnapshotRef.current = serializedSnapshot
            setHasDraft(true)
            setLastSavedAt(new Date())
            setStatus("saved")
            setLastError(null)
          } catch (error) {
            console.error("Failed to save draft to Supabase", error)
            setStatus("error")
            setLastError(error instanceof Error ? error.message : "Failed to autosave draft")
          }

          return
        }

        try {
          const record: IndexedDraftRecord<TSerialized> = {
            key: formKey,
            payload: serializedPayload,
            updatedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + expireMs).toISOString(),
          }

          await writeDraftToIndexedDb(record)

          const parsed = deserializeRef.current
            ? deserializeRef.current(serializedPayload)
            : ((serializedPayload as unknown) as Partial<T>)

          draftRef.current = parsed
          lastSavedSnapshotRef.current = serializedSnapshot
          setHasDraft(true)
          setLastSavedAt(new Date(record.updatedAt))
          setStatus("saved")
          setLastError(null)
        } catch (error) {
          console.error("Failed to save draft locally", error)
          setStatus("error")
          setLastError(error instanceof Error ? error.message : "Failed to autosave draft")
        }
      }

      void persistDraft()
    }, throttleMs)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [canSave, data, expireMs, formKey, isLoadingDraft, resolvedStorage, status, supabase, throttleMs, userId])

  const clearDraft = useCallback(async () => {
    if (!enabled) {
      return
    }

    try {
      if (resolvedStorage === "supabase") {
        if (!userId) {
          return
        }
        await supabase
          .from("form_drafts")
          .delete()
          .eq("user_id", userId)
          .eq("form_key", formKey)
      } else {
        await deleteDraftFromIndexedDb(formKey)
      }
    } catch (error) {
      console.error("Failed to clear draft", error)
      if (isMountedRef.current) {
        setStatus("error")
        setLastError(error instanceof Error ? error.message : "Unable to clear draft")
      }
      return
    }

    resetDraftState()
    if (isMountedRef.current) {
      setStatus("idle")
      setLastError(null)
    }
  }, [enabled, formKey, resetDraftState, resolvedStorage, supabase, userId])

  const resumeDraft = useCallback(async () => {
    if (draftRef.current) {
      return draftRef.current
    }

    return loadDraft()
  }, [loadDraft])

  return {
    status,
    lastSavedAt,
    lastError,
    hasDraft,
    isLoadingDraft,
    resolvedStorage,
    clearDraft,
    resumeDraft,
  }
}
