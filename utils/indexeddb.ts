const DB_NAME = "share-house-portal"
const STORE_NAME = "form_drafts"
const DB_VERSION = 1

export type IndexedDraftRecord<T> = {
  key: string
  payload: T
  updatedAt: string
  expiresAt?: string | null
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined"
}

function openDatabase(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    return Promise.reject(new Error("IndexedDB is not available in this environment"))
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" })
        store.createIndex("updatedAt", "updatedAt")
        store.createIndex("expiresAt", "expiresAt")
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"))
    }
  })
}

export async function readDraftFromIndexedDb<T>(key: string): Promise<IndexedDraftRecord<T> | null> {
  if (!isBrowser()) {
    return null
  }

  const db = await openDatabase()

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        resolve((request.result as IndexedDraftRecord<T> | undefined) ?? null)
      }

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to read draft from IndexedDB"))
      }

      transaction.oncomplete = () => {
        db.close()
      }

      transaction.onabort = () => {
        reject(transaction.error ?? new Error("IndexedDB transaction aborted"))
      }
    })
  } catch (error) {
    db.close()
    throw error
  }
}

export async function writeDraftToIndexedDb<T>(record: IndexedDraftRecord<T>): Promise<void> {
  if (!isBrowser()) {
    return
  }

  const db = await openDatabase()

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(record)

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to write draft to IndexedDB"))
      }

      transaction.oncomplete = () => {
        resolve()
        db.close()
      }

      transaction.onabort = () => {
        reject(transaction.error ?? new Error("IndexedDB transaction aborted"))
      }
    })
  } catch (error) {
    db.close()
    throw error
  }
}

export async function deleteDraftFromIndexedDb(key: string): Promise<void> {
  if (!isBrowser()) {
    return
  }

  const db = await openDatabase()

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(key)

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to delete draft from IndexedDB"))
      }

      transaction.oncomplete = () => {
        resolve()
        db.close()
      }

      transaction.onabort = () => {
        reject(transaction.error ?? new Error("IndexedDB transaction aborted"))
      }
    })
  } catch (error) {
    db.close()
    throw error
  }
}
