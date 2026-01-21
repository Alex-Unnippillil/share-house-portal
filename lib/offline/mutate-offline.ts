import { OfflineMutationConflictError, OfflineMutationRetryableError } from "./errors";
import { offlineMutationQueue, type OfflineMutationRecord, type OfflineQueueEvent } from "./queue";

export interface OfflineMutationConfig<TPayload, TResult> {
  key: string;
  handler: (payload: TPayload, record?: OfflineMutationRecord<TPayload>) => Promise<TResult>;
  shouldQueueOnError?: (error: unknown, payload: TPayload) => boolean;
  queue?: typeof offlineMutationQueue;
}

export interface MutateOfflineOptions<TPayload> {
  forceQueue?: boolean;
  metadata?: Record<string, unknown>;
}

export type OfflineMutationResult<TPayload, TResult> =
  | { status: "synced"; data: TResult }
  | { status: "queued"; record: OfflineMutationRecord<TPayload>; error?: unknown }
  | { status: "conflict"; error: OfflineMutationConflictError };

export async function mutateOffline<TPayload, TResult>(
  config: OfflineMutationConfig<TPayload, TResult>,
  payload: TPayload,
  options?: MutateOfflineOptions<TPayload>
): Promise<OfflineMutationResult<TPayload, TResult>> {
  const queue = config.queue ?? offlineMutationQueue;
  queue.registerHandler(config.key, config.handler);

  const shouldForceQueue = options?.forceQueue ?? (typeof navigator !== "undefined" ? !navigator.onLine : false);

  if (shouldForceQueue) {
    const record = await queue.enqueue(config.key, payload, options?.metadata);
    return { status: "queued", record };
  }

  try {
    const result = await config.handler(payload);
    return { status: "synced", data: result };
  } catch (error) {
    if (error instanceof OfflineMutationConflictError) {
      return { status: "conflict", error };
    }

    const shouldQueue =
      error instanceof OfflineMutationRetryableError ||
      (config.shouldQueueOnError ? config.shouldQueueOnError(error, payload) : false);

    if (shouldQueue) {
      const record = await queue.enqueue(config.key, payload, options?.metadata);
      return { status: "queued", record, error };
    }

    throw error;
  }
}

export type { OfflineMutationRecord, OfflineQueueEvent } from "./queue";
