const SHARE_TARGET_KEYWORDS = {
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
    "ticket",
  ],
  documents: [
    "document",
    "lease",
    "agreement",
    "attachment",
    "pdf",
    "documenso",
    "file",
  ],
  bookings: [
    "booking",
    "reservation",
    "calendar",
    "schedule",
    "amenity",
    "cal.com",
  ],
} as const

export const SHARE_TARGET_ACTION = "/share-target"
export const SHARE_INTENT_PATH = "/share/intent"

export type ShareDestination =
  | "documents"
  | "payments"
  | "messaging"
  | "maintenance"
  | "visitors"
  | "bookings"

export interface SharePayload {
  title?: string
  text?: string
  url?: string
  fileNames?: string[]
}

export interface ShareResolution {
  destination: ShareDestination
  reason: string
  explicit: boolean
}

export interface ShareDestinationMeta {
  label: string
  description: string
  href: string
  helper: string
}

export const SHARE_DESTINATION_META: Record<ShareDestination, ShareDestinationMeta> = {
  documents: {
    label: "Documents",
    description:
      "Capture leases, agreements, and attachments that were shared from other apps into the secure Roomsily vault.",
    href: "/documents",
    helper: "Upload or link shared files so roommates and managers can access the latest version.",
  },
  payments: {
    label: "Payments",
    description:
      "Attach receipts or payment confirmations to the rent ledger so roommates stay aligned on balances.",
    href: "/payments",
    helper: "Log catch-up payments or share proof-of-payment with everyone in the unit.",
  },
  messaging: {
    label: "Messaging",
    description:
      "Drop shared notes or links into the message board thread that needs follow-up from your housemates.",
    href: "/messaging",
    helper: "Start a discussion or pin the shared context so everyone can weigh in.",
  },
  maintenance: {
    label: "Maintenance",
    description:
      "Escalate shared photos or notes about broken items directly into a maintenance request.",
    href: "/maintenance",
    helper: "Pre-fill the maintenance form with what was shared so property managers can triage quickly.",
  },
  visitors: {
    label: "Visitors",
    description:
      "Turn shared contact cards or travel itineraries into an overnight visitor booking.",
    href: "/visitors",
    helper: "Keep roommates and property managers aware of who is staying over and when.",
  },
  bookings: {
    label: "Bookings",
    description:
      "Route shared links or screenshots about amenity reservations into your scheduling flow.",
    href: "/bookings",
    helper: "Confirm the amenity slot and notify roommates about the reservation details.",
  },
}

const DOCUMENT_FILE_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt",
  "rtf",
]

function normalizeValue(value?: string | null): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function toLower(value?: string | null): string | undefined {
  const normalized = normalizeValue(value)
  return normalized ? normalized.toLowerCase() : undefined
}

export function normalizeShareDestination(
  value?: string | null,
): ShareDestination | undefined {
  const normalized = toLower(value)
  if (!normalized) return undefined

  if (normalized.startsWith("doc")) return "documents"
  if (normalized.startsWith("pay")) return "payments"
  if (normalized.startsWith("main")) return "maintenance"
  if (normalized.startsWith("visit")) return "visitors"
  if (normalized.startsWith("book")) return "bookings"
  if (normalized.startsWith("message") || normalized.startsWith("thread")) {
    return "messaging"
  }

  return undefined
}

function containsKeyword(haystack: string, keywords: readonly string[]): boolean {
  const lowerHaystack = haystack.toLowerCase()
  return keywords.some((keyword) => lowerHaystack.includes(keyword))
}

function hasDocumentFile(files: string[] | undefined): boolean {
  if (!files?.length) return false
  return files.some((name) => {
    const lower = name.toLowerCase()
    return DOCUMENT_FILE_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`))
  })
}

function coalesceText(payload: SharePayload): string {
  const parts: string[] = []
  if (payload.title) parts.push(payload.title)
  if (payload.text) parts.push(payload.text)
  if (payload.url) parts.push(payload.url)
  return parts.join(" \u2022 ")
}

export function determineShareDestination(
  payload: SharePayload,
  explicitDestination?: ShareDestination | string | null,
): ShareResolution {
  const explicit =
    typeof explicitDestination === "string"
      ? normalizeShareDestination(explicitDestination)
      : explicitDestination

  if (explicit) {
    return {
      destination: explicit,
      reason: "Explicit share destination selected",
      explicit: true,
    }
  }

  if (payload.fileNames?.length && hasDocumentFile(payload.fileNames)) {
    return {
      destination: "documents",
      reason: "Detected shared files likely suited for document intake",
      explicit: false,
    }
  }

  const text = coalesceText(payload)
  const lowerText = text.toLowerCase()
  const lowerUrl = payload.url ? payload.url.toLowerCase() : ""

  if (lowerUrl.includes("stripe.com") || containsKeyword(lowerText, SHARE_TARGET_KEYWORDS.payments)) {
    return {
      destination: "payments",
      reason: "Detected payment terminology in shared content",
      explicit: false,
    }
  }

  if (lowerUrl.includes("cal.com") || containsKeyword(lowerText, SHARE_TARGET_KEYWORDS.bookings)) {
    return {
      destination: "bookings",
      reason: "Identified amenity or scheduling details in shared payload",
      explicit: false,
    }
  }

  if (containsKeyword(lowerText, SHARE_TARGET_KEYWORDS.visitors)) {
    return {
      destination: "visitors",
      reason: "Shared content references an overnight guest or visitor",
      explicit: false,
    }
  }

  if (containsKeyword(lowerText, SHARE_TARGET_KEYWORDS.maintenance)) {
    return {
      destination: "maintenance",
      reason: "Shared content references a maintenance issue",
      explicit: false,
    }
  }

  if (
    payload.fileNames?.length ||
    lowerUrl.includes("documenso") ||
    containsKeyword(lowerText, SHARE_TARGET_KEYWORDS.documents)
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

export function buildShareIntentUrl(
  payload: SharePayload,
  options: { destination?: ShareDestination; reason?: string } = {},
): string {
  const params = new URLSearchParams()
  params.set("source", "share-target")
  params.set("timestamp", Date.now().toString())

  if (options.destination) {
    params.set("destination", options.destination)
  }

  if (options.reason) {
    params.set("reason", options.reason)
  }

  if (payload.title) params.set("title", payload.title)
  if (payload.text) params.set("text", payload.text)
  if (payload.url) params.set("url", payload.url)
  if (payload.fileNames?.length) {
    params.set("files", JSON.stringify(payload.fileNames))
  }

  const query = params.toString()
  return query ? `${SHARE_INTENT_PATH}?${query}` : SHARE_INTENT_PATH
}

export function parseFileNamesParam(value: string | null | undefined): string[] {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === "string" ? item : String(item)))
        .filter((item) => item.trim().length > 0)
    }
  } catch (error) {
    // Fallback below
  }

  return value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

export function extractExplicitDestinationFromUrl(url: string): ShareDestination | undefined {
  try {
    const parsed = new URL(url)
    return normalizeShareDestination(parsed.searchParams.get("destination"))
  } catch (error) {
    return undefined
  }
}

function coerceParamValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.length ? value[0] : undefined
  }
  return typeof value === "string" ? value : undefined
}

export function coerceSharePayloadFromParams(
  params: Record<string, string | string[] | undefined>,
): SharePayload {
  const title = normalizeValue(coerceParamValue(params.title))
  const text = normalizeValue(coerceParamValue(params.text))
  const url = normalizeValue(coerceParamValue(params.url))
  const filesParam = coerceParamValue(params.files)

  return {
    title,
    text,
    url,
    fileNames: parseFileNamesParam(filesParam),
  }
}
