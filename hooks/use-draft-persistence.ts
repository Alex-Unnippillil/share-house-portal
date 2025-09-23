"use client";

import { useCallback, useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";

export type DraftPersistencePayload<T> = {
  values: T;
  updatedAt: number;
};

export type UseDraftPersistenceOptions<T> = {
  form: UseFormReturn<T>;
  storageKey: string;
  debounceMs?: number;
  maxWaitMs?: number;
  persistDraft?: (draft: DraftPersistencePayload<T>) => Promise<void> | void;
  deleteDraft?: () => Promise<void> | void;
  loadDraft?: () => Promise<DraftPersistencePayload<T> | null>;
};

export type UseDraftPersistenceResult<T> = {
  clearDraft: () => Promise<void>;
  flushDraft: () => Promise<void>;
  getLastSavedAt: () => number | null;
};

export function useDraftPersistence<T>(options: UseDraftPersistenceOptions<T>): UseDraftPersistenceResult<T> {
  const {
    form,
    storageKey,
    debounceMs = 3000,
    maxWaitMs = 10000,
    persistDraft,
    deleteDraft,
    loadDraft,
  } = options;

  const timerRef = useRef<number | null>(null);
  const lastPersistTimeRef = useRef<number | null>(null);
  const latestValuesRef = useRef<T>(form.getValues());
  const hydratedRef = useRef(false);
  const draftClearedRef = useRef(false);
  const skipNextPersistRef = useRef(false);

  const persist = useCallback(
    async (values: T) => {
      if (draftClearedRef.current) {
        return;
      }

      if (typeof window === "undefined") {
        return;
      }

      const updatedAt = Date.now();
      const payload: DraftPersistencePayload<T> = {
        values,
        updatedAt,
      };

      try {
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
        lastPersistTimeRef.current = updatedAt;
      } catch (error) {
        console.error("Failed to persist maintenance draft locally", error);
      }

      if (persistDraft) {
        try {
          await persistDraft(payload);
        } catch (error) {
          console.error("Failed to persist maintenance draft to Supabase", error);
        }
      }
    },
    [persistDraft, storageKey],
  );

  const flushDraft = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (draftClearedRef.current) {
      return;
    }

    await persist(latestValuesRef.current);
  }, [persist]);

  const schedulePersist = useCallback(
    (values: T) => {
      latestValuesRef.current = values;

      if (!hydratedRef.current) {
        return;
      }

      if (skipNextPersistRef.current) {
        skipNextPersistRef.current = false;
        return;
      }

      draftClearedRef.current = false;

      if (typeof window === "undefined") {
        return;
      }

      const now = Date.now();
      const lastPersistedAt = lastPersistTimeRef.current ?? 0;

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (now - lastPersistedAt >= maxWaitMs) {
        void persist(values);
        return;
      }

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void persist(latestValuesRef.current);
      }, debounceMs);
    },
    [debounceMs, maxWaitMs, persist],
  );

  const clearDraft = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    skipNextPersistRef.current = true;
    draftClearedRef.current = true;

    try {
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Failed to remove maintenance draft from localStorage", error);
    }

    lastPersistTimeRef.current = Date.now();

    if (deleteDraft) {
      try {
        await deleteDraft();
      } catch (error) {
        console.error("Failed to delete maintenance draft from Supabase", error);
      }
    }
  }, [deleteDraft, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let active = true;

    const hydrateDraft = async () => {
      let draft: DraftPersistencePayload<T> | null = null;
      const localValue = window.localStorage.getItem(storageKey);

      if (localValue) {
        try {
          draft = JSON.parse(localValue) as DraftPersistencePayload<T>;
        } catch (error) {
          console.error("Failed to parse maintenance draft from localStorage", error);
        }
      }

      if (!draft && loadDraft) {
        try {
          draft = await loadDraft();
        } catch (error) {
          console.error("Failed to load maintenance draft from Supabase", error);
        }
      }

      if (!active) {
        return;
      }

      if (draft?.values) {
        skipNextPersistRef.current = true;
        form.reset({
          ...form.getValues(),
          ...draft.values,
        });
        latestValuesRef.current = form.getValues();
        lastPersistTimeRef.current = draft.updatedAt ?? Date.now();
        draftClearedRef.current = false;

        if (!localValue) {
          try {
            window.localStorage.setItem(
              storageKey,
              JSON.stringify({
                values: latestValuesRef.current,
                updatedAt: lastPersistTimeRef.current,
              }),
            );
          } catch (error) {
            console.error("Failed to persist hydrated maintenance draft locally", error);
          }
        }
      } else {
        latestValuesRef.current = form.getValues();
        lastPersistTimeRef.current = Date.now();
      }
    };

    void hydrateDraft().finally(() => {
      if (active) {
        hydratedRef.current = true;
      }
    });

    return () => {
      active = false;
    };
  }, [form, loadDraft, storageKey]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      schedulePersist(values as T);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [form, schedulePersist]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (!draftClearedRef.current) {
        void persist(latestValuesRef.current);
      }
    };
  }, [persist]);

  const getLastSavedAt = useCallback(() => lastPersistTimeRef.current, []);

  return {
    clearDraft,
    flushDraft,
    getLastSavedAt,
  };
}
