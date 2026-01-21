"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { offlineMutationQueue, type OfflineQueueEvent } from "@/lib/offline/queue";
import {
  mutateOffline,
  type MutateOfflineOptions,
  type OfflineMutationConfig,
  type OfflineMutationResult,
} from "@/lib/offline/mutate-offline";

interface UseOfflineMutationOptions<TPayload, TResult>
  extends Omit<OfflineMutationConfig<TPayload, TResult>, "queue"> {
  onEvent?: (event: OfflineQueueEvent) => void;
}

interface UseOfflineMutationReturn<TPayload, TResult> {
  mutate: (
    payload: TPayload,
    options?: MutateOfflineOptions<TPayload>
  ) => Promise<OfflineMutationResult<TPayload, TResult>>;
  isMutating: boolean;
  pendingCount: number;
}

export function useOfflineMutation<TPayload, TResult>(
  options: UseOfflineMutationOptions<TPayload, TResult>
): UseOfflineMutationReturn<TPayload, TResult> {
  const { key, handler, shouldQueueOnError, onEvent } = options;
  const [isMutating, setIsMutating] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const config = useMemo<OfflineMutationConfig<TPayload, TResult>>(
    () => ({ key, handler, shouldQueueOnError, queue: offlineMutationQueue }),
    [key, handler, shouldQueueOnError]
  );

  useEffect(() => {
    offlineMutationQueue.registerHandler(key, handler);
    return () => {
      offlineMutationQueue.unregisterHandler(key);
    };
  }, [key, handler]);

  useEffect(() => {
    let isMounted = true;
    offlineMutationQueue
      .count(key)
      .then((count) => {
        if (isMounted) {
          setPendingCount(count);
        }
      })
      .catch((error) => {
        console.error("Failed to read offline mutation count", error);
      });
    return () => {
      isMounted = false;
    };
  }, [key]);

  useEffect(() => {
    const unsubscribe = offlineMutationQueue.subscribe((event) => {
      if (event.record.type !== key) {
        return;
      }

      if (event.type === "enqueued") {
        setPendingCount((count) => count + 1);
      } else if (event.type === "synced" || event.type === "conflict") {
        setPendingCount((count) => Math.max(0, count - 1));
      }

      onEvent?.(event);
    });

    return unsubscribe;
  }, [key, onEvent]);

  const mutate = useCallback(
    async (
      payload: TPayload,
      mutateOptions?: MutateOfflineOptions<TPayload>
    ): Promise<OfflineMutationResult<TPayload, TResult>> => {
      setIsMutating(true);
      try {
        return await mutateOffline(config, payload, mutateOptions);
      } finally {
        setIsMutating(false);
      }
    },
    [config]
  );

  return { mutate, isMutating, pendingCount };
}
