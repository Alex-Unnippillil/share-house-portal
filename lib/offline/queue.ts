import { OfflineMutationConflictError } from "./errors";

export interface OfflineMutationRecord<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  createdAt: number;
  attempts: number;
  lastError?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type OfflineQueueEvent =
  | { type: "enqueued"; record: OfflineMutationRecord }
  | { type: "synced"; record: OfflineMutationRecord; result?: unknown }
  | { type: "conflict"; record: OfflineMutationRecord; error: OfflineMutationConflictError }
  | { type: "failed"; record: OfflineMutationRecord; error: unknown };

export type MutationHandler<TPayload = unknown, TResult = unknown> = (
  payload: TPayload,
  record?: OfflineMutationRecord<TPayload>
) => Promise<TResult>;

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const DB_NAME = "roomsily-offline-mutations";
const STORE_NAME = "mutations";
const DB_VERSION = 1;

export class OfflineMutationQueue {
  private handlers = new Map<string, MutationHandler<any, any>>();
  private subscribers = new Set<(event: OfflineQueueEvent) => void>();
  private memoryStore: OfflineMutationRecord[] = [];
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private processingPromise: Promise<void> | null = null;
  private readonly handleOnline = () => {
    void this.processQueue();
  };

  constructor(private readonly dbName = DB_NAME) {
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("online", this.handleOnline);
    }
  }

  registerHandler<TPayload, TResult>(key: string, handler: MutationHandler<TPayload, TResult>) {
    this.handlers.set(key, handler as MutationHandler<any, any>);
    void this.processQueue();
  }

  unregisterHandler(key: string) {
    this.handlers.delete(key);
  }

  subscribe(callback: (event: OfflineQueueEvent) => void) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  async enqueue<TPayload>(
    type: string,
    payload: TPayload,
    metadata?: Record<string, unknown>
  ): Promise<OfflineMutationRecord<TPayload>> {
    const record: OfflineMutationRecord<TPayload> = {
      id: generateId(),
      type,
      payload,
      createdAt: Date.now(),
      attempts: 0,
      lastError: null,
      metadata: metadata ?? null,
    };

    const db = await this.openDB();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error("Failed to store offline mutation"));
      });
    } else {
      this.memoryStore.push(record);
    }

    this.notify({ type: "enqueued", record });

    if (typeof navigator !== "undefined" && navigator.onLine) {
      void this.processQueue();
    }

    return record;
  }

  async processQueue(): Promise<void> {
    if (this.processingPromise) {
      return this.processingPromise;
    }

    this.processingPromise = (async () => {
      const records = await this.list();

      for (const record of records) {
        const handler = this.handlers.get(record.type);
        if (!handler) {
          continue;
        }

        try {
          const result = await handler(record.payload, record);
          await this.remove(record.id);
          this.notify({ type: "synced", record, result });
        } catch (error) {
          if (error instanceof OfflineMutationConflictError) {
            await this.remove(record.id);
            this.notify({ type: "conflict", record, error });
            continue;
          }

          const updatedRecord: OfflineMutationRecord = {
            ...record,
            attempts: record.attempts + 1,
            lastError:
              error instanceof Error
                ? error.message
                : typeof error === "string"
                ? error
                : "Unknown error",
          };

          await this.put(updatedRecord);
          this.notify({ type: "failed", record: updatedRecord, error });
        }
      }
    })();

    try {
      await this.processingPromise;
    } finally {
      this.processingPromise = null;
    }
  }

  async list(type?: string): Promise<OfflineMutationRecord[]> {
    const db = await this.openDB();
    let records: OfflineMutationRecord[];

    if (db) {
      records = await new Promise<OfflineMutationRecord[]>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve((request.result as OfflineMutationRecord[]) ?? []);
        request.onerror = () => reject(request.error ?? new Error("Failed to read offline mutations"));
      });
    } else {
      records = [...this.memoryStore];
    }

    if (type) {
      return records.filter((record) => record.type === type);
    }

    return records;
  }

  async count(type?: string): Promise<number> {
    const records = await this.list(type);
    return records.length;
  }

  async clear(type?: string) {
    if (!type) {
      const db = await this.openDB();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, "readwrite");
          const store = transaction.objectStore(STORE_NAME);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error ?? new Error("Failed to clear offline queue"));
        });
      }
      this.memoryStore = [];
      return;
    }

    const records = await this.list();
    for (const record of records) {
      if (record.type === type) {
        await this.remove(record.id);
      }
    }
  }

  private async remove(id: string) {
    const db = await this.openDB();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error("Failed to delete offline mutation"));
      });
    } else {
      this.memoryStore = this.memoryStore.filter((record) => record.id !== id);
    }
  }

  private async put(record: OfflineMutationRecord) {
    const db = await this.openDB();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error("Failed to update offline mutation"));
      });
    } else {
      const index = this.memoryStore.findIndex((item) => item.id === record.id);
      if (index === -1) {
        this.memoryStore.push(record);
      } else {
        this.memoryStore[index] = record;
      }
    }
  }

  private notify(event: OfflineQueueEvent) {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(event);
      } catch (error) {
        console.error("Offline queue subscriber error", error);
      }
    }
  }

  private async openDB(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === "undefined") {
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        const request = indexedDB.open(this.dbName, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "id" });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.error("Failed to open offline mutation queue", request.error);
          resolve(null);
        };
      });
    }

    return this.dbPromise;
  }
}

export const offlineMutationQueue = new OfflineMutationQueue();
