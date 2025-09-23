const SHARE_TARGET_ACTION = "/share-target"
const SHARE_INTENT_PATH = "/share/intent"

const SHARE_KEYWORDS = {
  payments: [
    "rent",
    "payment",
    "stripe",
    "invoice",
    "receipt",
    "balance",
    "autopay",
    "charge",
  ],
  visitors: [
    "guest",
    "visitor",
    "overnight",
    "stay",
    "host",
  ],
  maintenance: [
    "maintenance",
    "repair",
    "fix",
    "issue",
    "leak",
    "broken",
    "damage",
    "work order",
  ],
  documents: ["document", "lease", "agreement", "attachment", "pdf", "documenso", "file"],
  bookings: ["booking", "reservation", "calendar", "schedule", "amenity", "cal.com"],
}

const DOCUMENT_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "rtf"]

function normalizeValue(value) {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

function normalizeDestination(value) {
  const normalized = normalizeValue(value)
  if (!normalized) return undefined
  const lower = normalized.toLowerCase()

  if (lower.startsWith("doc")) return "documents"
  if (lower.startsWith("pay")) return "payments"
  if (lower.startsWith("main")) return "maintenance"
  if (lower.startsWith("visit")) return "visitors"
  if (lower.startsWith("book")) return "bookings"
  if (lower.startsWith("message") || lower.startsWith("thread")) return "messaging"
  return undefined
}

function containsKeyword(haystack, keywords) {
  const lower = haystack.toLowerCase()
  return keywords.some((keyword) => lower.includes(keyword))
}

function hasDocumentFile(files) {
  if (!files || !files.length) return false
  return files.some((name) => {
    const lower = name.toLowerCase()
    return DOCUMENT_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`))
  })
}

function collectShareText(payload) {
  const segments = []
  if (payload.title) segments.push(payload.title)
  if (payload.text) segments.push(payload.text)
  if (payload.url) segments.push(payload.url)
  return segments.join(" • ")
}

function determineShareDestination(payload, explicitDestination) {
  const explicit = normalizeDestination(explicitDestination)
  if (explicit) {
    return {
      destination: explicit,
      reason: "Explicit share destination selected",
      explicit: true,
    }
  }

  if (payload.fileNames && hasDocumentFile(payload.fileNames)) {
    return {
      destination: "documents",
      reason: "Detected shared files likely suited for document intake",
      explicit: false,
    }
  }

  const shareText = collectShareText(payload)
  const lowerUrl = payload.url ? payload.url.toLowerCase() : ""

  if (lowerUrl.includes("stripe.com") || containsKeyword(shareText, SHARE_KEYWORDS.payments)) {
    return {
      destination: "payments",
      reason: "Detected payment terminology in shared content",
      explicit: false,
    }
  }

  if (lowerUrl.includes("cal.com") || containsKeyword(shareText, SHARE_KEYWORDS.bookings)) {
    return {
      destination: "bookings",
      reason: "Identified amenity or scheduling details in shared payload",
      explicit: false,
    }
  }

  if (containsKeyword(shareText, SHARE_KEYWORDS.visitors)) {
    return {
      destination: "visitors",
      reason: "Shared content references an overnight guest or visitor",
      explicit: false,
    }
  }

  if (containsKeyword(shareText, SHARE_KEYWORDS.maintenance)) {
    return {
      destination: "maintenance",
      reason: "Shared content references a maintenance issue",
      explicit: false,
    }
  }

  if (
    (payload.fileNames && payload.fileNames.length) ||
    lowerUrl.includes("documenso") ||
    containsKeyword(shareText, SHARE_KEYWORDS.documents)
  ) {
    return {
      destination: "documents",
      reason: "Shared context aligns with document management",
      explicit: false,
    }
  }

  return {
    destination: "messaging",
    reason: "Defaulted to messaging hub for general share content",
    explicit: false,
  }
}

function parseSharedFileNames(formData) {
  const files = formData.getAll("files")
  return files
    .map((entry) => {
      if (typeof entry === "string") return entry
      if (entry && typeof entry.name === "string") return entry.name
      return undefined
    })
    .filter((value) => Boolean(value))
}

function extractSharePayload(formData) {
  return {
    title: normalizeValue(formData.get("title")),
    text: normalizeValue(formData.get("text")),
    url: normalizeValue(formData.get("url")),
    fileNames: parseSharedFileNames(formData),
  }
}

function buildShareIntentUrl(payload, resolution, additional = {}) {
  const params = new URLSearchParams()
  params.set("source", "share-target")
  params.set("timestamp", Date.now().toString())
  if (resolution.destination) {
    params.set("destination", resolution.destination)
  }
  if (resolution.reason) {
    params.set("reason", resolution.reason)
  }
  if (payload.title) params.set("title", payload.title)
  if (payload.text) params.set("text", payload.text)
  if (payload.url) params.set("url", payload.url)
  if (payload.fileNames && payload.fileNames.length) {
    params.set("files", JSON.stringify(payload.fileNames))
  }
  Object.entries(additional).forEach(([key, value]) => {
    if (value != null) {
      params.set(key, String(value))
    }
  })
  return `${SHARE_INTENT_PATH}?${params.toString()}`
}

function parseExplicitDestinationFromRequestUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.searchParams.get("destination") || undefined
  } catch (error) {
    return undefined
  }
}

async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData()
    const payload = extractSharePayload(formData)
    const explicit = parseExplicitDestinationFromRequestUrl(event.request.url)
    const resolution = determineShareDestination(payload, explicit)
    const redirectUrl = buildShareIntentUrl(payload, resolution)

    event.waitUntil(
      (async () => {
        const clientId = event.resultingClientId || event.clientId
        if (clientId) {
          const client = await self.clients.get(clientId)
          if (client) {
            client.navigate(redirectUrl)
            return
          }
        }
        await self.clients.openWindow(redirectUrl)
      })(),
    )

    return Response.redirect(redirectUrl, 303)
  } catch (error) {
    console.error("Roomsily share target failed", error)
    return Response.redirect(
      `${SHARE_INTENT_PATH}?source=share-target&error=share-target`,
      303,
    )
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (url.pathname === SHARE_TARGET_ACTION && event.request.method === "POST") {
    event.respondWith(handleShareTarget(event))
  }
})

self.addEventListener("push", function (event) {
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

self.addEventListener("notificationclick", function (event) {
  console.log("Notification click received.")
  event.notification.close()
  event.waitUntil(self.clients.openWindow("https://roomsily.app"))
})
