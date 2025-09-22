const MUTATION_METHODS = ["POST", "PUT", "PATCH", "DELETE"]
const DB_NAME = "share-house-portal-offline"
const STORE_NAME = "mutation-queue"
const DB_VERSION = 1
const SYNC_TAG = "share-house-portal-sync"

let processingQueue = false

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim()
      await processQueue()
    })()
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (!shouldHandleRequest(request)) {
    return
  }

  const bodyPromise =
    request.method === "GET" || request.method === "HEAD"
      ? Promise.resolve(null)
      : request
          .clone()
          .arrayBuffer()
          .then((buffer) => (buffer.byteLength ? buffer : null))
          .catch(() => null)

  event.respondWith(
    (async () => {
      try {
        return await fetch(request)
      } catch (error) {
        const body = await bodyPromise
        const queued = await queueRequest(request, body)
        await broadcastMessage("MUTATION_QUEUED", {
          url: queued.url,
          method: queued.method,
        })

        if ("sync" in self.registration) {
          try {
            await self.registration.sync.register(SYNC_TAG)
          } catch (syncError) {
            console.error("Failed to register background sync", syncError)
          }
        }

        return new Response(
          JSON.stringify({ queued: true }),
          {
            status: 202,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      }
    })()
  )
})

self.addEventListener("message", (event) => {
  const type = event.data?.type

  if (type === "ONLINE" || type === "PROCESS_QUEUE") {
    event.waitUntil(processQueue())
  }
})

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processQueue())
  }
})

self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || "/icon.png",
      badge: "/badge.png",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: "2",
      },
    }

    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow("https://onyx-rho-pink.vercel.app"))
})

function shouldHandleRequest(request) {
  if (!MUTATION_METHODS.includes(request.method)) {
    return false
  }

  try {
    const url = new URL(request.url)
    return url.origin === self.location.origin
  } catch (error) {
    return false
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function queueRequest(request, body) {
  const entry = {
    id: generateId(),
    url: request.url,
    method: request.method,
    headers: serializeHeaders(request.headers),
    body: body || null,
    timestamp: Date.now(),
    credentials: request.credentials,
  }

  await saveRequest(entry)
  return entry
}

async function saveRequest(entry) {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    store.put(entry)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      const error = transaction.error || new Error("Failed to save request")
      db.close()
      reject(error)
    }
  })
}

async function getQueuedRequests() {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result || [])
    }

    request.onerror = () => {
      reject(request.error)
    }

    transaction.oncomplete = () => {
      db.close()
    }

    transaction.onerror = () => {
      const error = transaction.error || new Error("Failed to read queue")
      db.close()
      reject(error)
    }
  })
}

async function deleteQueuedRequest(id) {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    store.delete(id)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      const error = transaction.error || new Error("Failed to delete request")
      db.close()
      reject(error)
    }
  })
}

async function processQueue() {
  if (processingQueue) {
    return
  }

  processingQueue = true

  try {
    const queuedRequests = await getQueuedRequests()

    if (!queuedRequests.length) {
      return
    }

    queuedRequests.sort((a, b) => a.timestamp - b.timestamp)

    for (const queued of queuedRequests) {
      try {
        const response = await fetch(queued.url, {
          method: queued.method,
          headers: queued.headers ? new Headers(queued.headers) : undefined,
          body: queued.body || undefined,
          credentials: queued.credentials || "same-origin",
        })

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`)
        }

        await deleteQueuedRequest(queued.id)
        await broadcastMessage("MUTATION_SENT", {
          url: queued.url,
          method: queued.method,
        })
      } catch (error) {
        await broadcastMessage("MUTATION_ERROR", {
          url: queued.url,
          method: queued.method,
          message: error?.message || "Unknown error",
        })
        break
      }
    }
  } catch (error) {
    console.error("Failed to process offline queue", error)
  } finally {
    processingQueue = false
  }
}

async function broadcastMessage(type, payload) {
  try {
    const clientList = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    })

    for (const client of clientList) {
      client.postMessage({ type, payload })
    }
  } catch (error) {
    console.error("Failed to broadcast message", error)
  }
}

function serializeHeaders(headers) {
  const serialized = {}
  for (const [key, value] of headers.entries()) {
    serialized[key] = value
  }
  return serialized
}

function generateId() {
  if (self.crypto && "randomUUID" in self.crypto) {
    return self.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
