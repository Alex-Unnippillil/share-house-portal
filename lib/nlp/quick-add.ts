import * as chrono from "chrono-node"

export type QuickAddIntent =
  | "invoice"
  | "booking"
  | "maintenance"
  | "visitor"
  | "unknown"

export interface InvoiceQuickAddPayload {
  amount: number
  amountCents: number
  currency: string
  dueDate?: string
  description?: string
  counterparty?: string
}

export interface BookingQuickAddPayload {
  amenityId: string
  amenityLabel: string
  startTime: string
  endTime: string
  note?: string
  hasExplicitEnd: boolean
}

export interface MaintenanceQuickAddPayload {
  title: string
  description: string
  priority: "low" | "normal" | "high" | "urgent"
}

export interface VisitorQuickAddPayload {
  guestName: string
  guestEmail: string
  checkIn: string
  checkOut: string
  purpose: string
  guestPhone?: string
}

type QuickAddPayloadMap = {
  invoice: InvoiceQuickAddPayload
  booking: BookingQuickAddPayload
  maintenance: MaintenanceQuickAddPayload
  visitor: VisitorQuickAddPayload
  unknown: never
}

export interface QuickAddField {
  field: string
  label: string
  required: boolean
  isValid: boolean
  value?: string
  helperText?: string
}

export interface QuickAddParseOptions {
  referenceDate?: Date
}

interface QuickAddResultBase<T extends QuickAddIntent> {
  intent: T
  raw: string
  summary: string | null
  confidence: number
  fields: QuickAddField[]
  errors: string[]
  warnings: string[]
  isReady: boolean
  payload: QuickAddPayloadMap[T] | null
}

export type QuickAddParseResult =
  | QuickAddResultBase<"invoice">
  | QuickAddResultBase<"booking">
  | QuickAddResultBase<"maintenance">
  | QuickAddResultBase<"visitor">
  | QuickAddResultBase<"unknown">

type IntentDetection = {
  intent: QuickAddIntent
  confidence: number
}

type ChronoResult = chrono.ParsedResult

const KNOWN_CODES = new Set([
  "USD",
  "CAD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "NZD",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "ZAR",
  "BRL",
  "MXN",
  "CNY",
  "HKD",
  "SGD",
  "INR",
])

const AMENITIES = [
  {
    id: "kitchen",
    label: "Kitchen",
    patterns: [/kitchen/i, /cook|cooking/i],
  },
  {
    id: "tv_room",
    label: "TV room",
    patterns: [/tv\s?room/i, /movie/i, /screen/i],
  },
  {
    id: "parking",
    label: "Parking spot",
    patterns: [/parking/i, /garage/i, /car\s?spot/i],
  },
  {
    id: "playstation",
    label: "PlayStation nook",
    patterns: [/playstation/i, /ps5/i, /gaming/i],
  },
  {
    id: "shared_computer",
    label: "Shared computer",
    patterns: [/computer/i, /workstation/i, /shared\s?pc/i],
  },
] as const

type AmenityMatch = (typeof AMENITIES)[number]

type CurrencyDetection = {
  amount: number
  amountCents: number
  currency: string
  match: string
}

type DateDetection = {
  isoDate: string
  source: string
}

type DateRangeDetection = {
  start: string
  end: string
  source: string
  hasExplicitEnd: boolean
}

const quickAddChrono = chrono.casual.clone()

quickAddChrono.refiners.push({
  refine: (text, results) =>
    results.map((result) => {
      const source =
        typeof text === "string"
          ? text
          : typeof (text as { text?: string })?.text === "string"
            ? (text as { text?: string }).text!
            : ""
      const prefix = source
        .slice(Math.max(0, result.index - 8), result.index)
        .toLowerCase()
      if (/\b(due|by|before|on)\s+$/.test(prefix)) {
        result.tags.quickAddDueDate = true
      }

      if (result.end) {
        result.tags.quickAddHasExplicitEnd = true
      }

      return result
    }),
})

const SYMBOL_TO_CODE: Record<string, string> = {
  "$": "USD",
  "CA$": "CAD",
  "C$": "CAD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "A$": "AUD",
}

export function parseQuickAddCommand(
  input: string,
  options: QuickAddParseOptions = {},
): QuickAddParseResult {
  const raw = input.trim()
  const referenceDate = options.referenceDate ?? new Date()

  if (!raw) {
    return {
      intent: "unknown",
      raw,
      summary: null,
      confidence: 0,
      fields: [],
      errors: ["Enter a command, e.g. “Add invoice 200 CAD due Friday”."],
      warnings: [],
      isReady: false,
      payload: null,
    }
  }

  const detection = detectIntent(raw)
  const chronoResults = quickAddChrono.parse(raw, referenceDate, {
    forwardDate: true,
  })

  switch (detection.intent) {
    case "invoice":
      return parseInvoice(raw, detection, chronoResults)
    case "booking":
      return parseBooking(raw, detection, chronoResults)
    case "maintenance":
      return parseMaintenance(raw, detection)
    case "visitor":
      return parseVisitor(raw, detection, chronoResults)
    default:
      return {
        intent: "unknown",
        raw,
        summary: null,
        confidence: detection.confidence,
        fields: [],
        errors: ["We couldn’t detect what to do with that yet."],
        warnings: [],
        isReady: false,
        payload: null,
      }
  }
}

function parseInvoice(
  text: string,
  detection: IntentDetection,
  chronoResults: ChronoResult[],
): QuickAddParseResult {
  const currency = detectCurrency(text)
  const dueDate = extractDueDate(chronoResults)
  const counterparty = extractCounterparty(text)
  const description = extractDescription(text)

  const fields: QuickAddField[] = [
    {
      field: "amount",
      label: "Amount",
      required: true,
      isValid: Boolean(currency?.amount),
      value: currency ? formatCurrency(currency.amount, currency.currency) : undefined,
      helperText: currency ? undefined : "Include an amount, e.g. 200 CAD or $125.",
    },
    {
      field: "currency",
      label: "Currency",
      required: true,
      isValid: Boolean(currency?.currency),
      value: currency?.currency,
      helperText: currency?.currency ? undefined : "Specify a currency like USD, CAD, EUR…",
    },
    {
      field: "dueDate",
      label: "Due date",
      required: false,
      isValid: true,
      value: dueDate?.isoDate,
      helperText: dueDate ? undefined : "Add “due Friday” or a specific date (optional).",
    },
  ]

  const payload: InvoiceQuickAddPayload | null = currency
    ? {
        amount: currency.amount,
        amountCents: currency.amountCents,
        currency: currency.currency,
        dueDate: dueDate?.isoDate,
        counterparty: counterparty ?? undefined,
        description: description ?? undefined,
      }
    : null

  const summaryParts = ["Invoice"]
  if (currency) {
    summaryParts.push(formatCurrency(currency.amount, currency.currency))
  }
  if (counterparty) {
    summaryParts.push(`for ${titleCase(counterparty)}`)
  }
  if (dueDate) {
    summaryParts.push(`due ${formatDate(dueDate.isoDate)}`)
  }

  const errors: string[] = []
  if (!currency) {
    errors.push("Add an amount with currency to continue.")
  }

  return {
    intent: "invoice",
    raw: text,
    summary: summaryParts.length > 1 ? summaryParts.join(" ") : null,
    confidence: detection.confidence,
    fields,
    errors,
    warnings: [],
    isReady: Boolean(payload),
    payload,
  }
}

function parseBooking(
  text: string,
  detection: IntentDetection,
  chronoResults: ChronoResult[],
): QuickAddParseResult {
  const amenity = detectAmenity(text)
  const range = extractDateRange(chronoResults)

  const fields: QuickAddField[] = [
    {
      field: "amenity",
      label: "Amenity",
      required: true,
      isValid: Boolean(amenity),
      value: amenity?.label,
      helperText: amenity ? undefined : "Mention kitchen, TV room, parking, PlayStation…",
    },
    {
      field: "startTime",
      label: "Start",
      required: true,
      isValid: Boolean(range?.start),
      value: range ? formatDateTime(range.start) : undefined,
      helperText: range ? undefined : "Add when it should start, e.g. tomorrow 6pm.",
    },
    {
      field: "endTime",
      label: "End",
      required: true,
      isValid: Boolean(range?.end),
      value: range ? formatDateTime(range.end) : undefined,
      helperText: range
        ? undefined
        : "Include an end time like “until 8pm” or “for 2 hours”.",
    },
  ]

  const warnings: string[] = []
  if (range && !range.hasExplicitEnd) {
    warnings.push("No explicit end time detected — defaulted to 60 minutes.")
  }

  const payload: BookingQuickAddPayload | null = amenity && range
    ? {
        amenityId: amenity.id,
        amenityLabel: amenity.label,
        startTime: range.start,
        endTime: range.end,
        hasExplicitEnd: range.hasExplicitEnd,
      }
    : null

  const summary =
    amenity && range
      ? `${amenity.label} • ${formatDate(range.start)} ${formatTimeRange(range.start, range.end)}`
      : null

  const errors: string[] = []
  if (!amenity) {
    errors.push("Specify which amenity to reserve.")
  }
  if (!range) {
    errors.push("Tell us when the booking should happen.")
  }

  return {
    intent: "booking",
    raw: text,
    summary,
    confidence: detection.confidence,
    fields,
    errors,
    warnings,
    isReady: Boolean(payload),
    payload,
  }
}

function parseMaintenance(
  text: string,
  detection: IntentDetection,
): QuickAddParseResult {
  const priority = detectPriority(text)
  const cleaned = text
    .replace(/^(?:log|add|create|submit)\s+/i, "")
    .replace(/maintenance\s+(?:ticket|issue|request)/i, "")
    .trim()

  const title = titleCase(cleaned.split(/for |because |due to /i)[0]?.trim() || "")
  const description = sentenceCase(text)

  const hasTitle = title.length > 0

  const fields: QuickAddField[] = [
    {
      field: "title",
      label: "Title",
      required: true,
      isValid: hasTitle,
      value: hasTitle ? title : undefined,
      helperText: hasTitle ? undefined : "Briefly describe the issue, e.g. “sink leak”.",
    },
    {
      field: "priority",
      label: "Priority",
      required: false,
      isValid: true,
      value: priority.toUpperCase(),
      helperText: "Mention urgent/high/low to adjust priority.",
    },
  ]

  const payload: MaintenanceQuickAddPayload | null = hasTitle
    ? {
        title,
        description,
        priority,
      }
    : null

  const errors = hasTitle ? [] : ["Describe what needs attention."]

  return {
    intent: "maintenance",
    raw: text,
    summary: hasTitle ? `${title} (${priority} priority)` : null,
    confidence: detection.confidence,
    fields,
    errors,
    warnings: [],
    isReady: Boolean(payload),
    payload,
  }
}

function parseVisitor(
  text: string,
  detection: IntentDetection,
  chronoResults: ChronoResult[],
): QuickAddParseResult {
  const guestName = extractGuestName(text)
  const guestEmail = extractEmail(text)
  const guestPhone = extractPhone(text)
  const purpose = extractPurpose(text)
  const range = extractDateRange(chronoResults)

  const fields: QuickAddField[] = [
    {
      field: "guestName",
      label: "Guest",
      required: true,
      isValid: Boolean(guestName),
      value: guestName ? titleCase(guestName) : undefined,
      helperText: guestName ? undefined : "Include the guest’s name after “visitor” or “guest”.",
    },
    {
      field: "guestEmail",
      label: "Email",
      required: true,
      isValid: Boolean(guestEmail),
      value: guestEmail ?? undefined,
      helperText: guestEmail
        ? undefined
        : "Add their email in parentheses or after the name.",
    },
    {
      field: "dates",
      label: "Stay",
      required: true,
      isValid: Boolean(range?.start && range?.end),
      value: range ? `${formatDate(range.start)} → ${formatDate(range.end)}` : undefined,
      helperText: range
        ? undefined
        : "Use a range like “Sept 1-3” or “from Friday to Sunday”.",
    },
    {
      field: "purpose",
      label: "Purpose",
      required: true,
      isValid: Boolean(purpose),
      value: purpose ? sentenceCase(purpose) : undefined,
      helperText: purpose ? undefined : "Mention why they’re visiting (e.g. wedding, family).",
    },
  ]

  const payload: VisitorQuickAddPayload | null =
    guestName && guestEmail && purpose && range
      ? {
          guestName: titleCase(guestName),
          guestEmail,
          guestPhone: guestPhone ?? undefined,
          checkIn: range.start,
          checkOut: range.end,
          purpose: sentenceCase(purpose),
        }
      : null

  const errors: string[] = []
  if (!guestName) {
    errors.push("Provide the guest’s name.")
  }
  if (!guestEmail) {
    errors.push("Provide the guest’s email address.")
  }
  if (!range) {
    errors.push("Include the stay dates.")
  }
  if (!purpose) {
    errors.push("State the purpose of the visit.")
  }

  return {
    intent: "visitor",
    raw: text,
    summary:
      payload
        ? `${payload.guestName} • ${formatDate(payload.checkIn)} to ${formatDate(payload.checkOut)} for ${payload.purpose}`
        : null,
    confidence: detection.confidence,
    fields,
    errors,
    warnings: [],
    isReady: Boolean(payload),
    payload,
  }
}

function detectIntent(text: string): IntentDetection {
  const lowered = text.toLowerCase()
  const scores: Record<QuickAddIntent, number> = {
    invoice: 0,
    booking: 0,
    maintenance: 0,
    visitor: 0,
    unknown: 0,
  }

  const addScore = (intent: QuickAddIntent, weight = 1) => {
    scores[intent] += weight
  }

  if (/^\/(invoice|booking|maintenance|visitor)\b/.test(lowered)) {
    const match = lowered.match(/^\/(invoice|booking|maintenance|visitor)\b/)
    if (match) {
      addScore(match[1] as QuickAddIntent, 3)
    }
  }

  if (/(invoice|rent|bill|payment)/i.test(lowered)) addScore("invoice", 2)
  if (/(due|charge|amount)/i.test(lowered)) addScore("invoice", 1)
  if (/\b(book|reserve|schedule)\b/.test(lowered)) addScore("booking", 2)
  if (/\bamenity|kitchen|parking|playstation|tv\b/.test(lowered)) addScore("booking", 1.5)
  if (/\bmaintenance|repair|fix|broken|leak\b/.test(lowered)) addScore("maintenance", 2)
  if (/\bvisitor|guest|overnight\b/.test(lowered)) addScore("visitor", 2)
  if (/\bapprove|register|log\b/.test(lowered)) addScore("visitor", 1)

  const currency = detectCurrency(text)
  if (currency) addScore("invoice", 0.5)

  let bestIntent: QuickAddIntent = "unknown"
  let bestScore = 0
  for (const [intent, score] of Object.entries(scores) as Array<[
    QuickAddIntent,
    number,
  ]>) {
    if (score > bestScore) {
      bestIntent = intent
      bestScore = score
    }
  }

  const confidence = bestScore === 0 ? 0 : Math.min(1, bestScore / 3)

  return { intent: bestIntent, confidence }
}

function detectCurrency(text: string): CurrencyDetection | null {
  const normalized = text.replace(/,/g, "")

  const symbolMatch = normalized.match(
    /(CA\$|C\$|A\$|\$|€|£|¥)\s*(\d+(?:\.\d{1,2})?)/,
  )
  if (symbolMatch) {
    const symbol = symbolMatch[1]
    const amount = Number.parseFloat(symbolMatch[2])
    const currency = SYMBOL_TO_CODE[symbol]
    if (!Number.isNaN(amount) && currency) {
      return {
        amount,
        amountCents: Math.round(amount * 100),
        currency,
        match: symbolMatch[0],
      }
    }
  }

  const codeLeading = normalized.match(
    /\b([A-Za-z]{3})\s*(\d+(?:\.\d{1,2})?)\b/,
  )
  if (codeLeading) {
    const code = codeLeading[1].toUpperCase()
    const amount = Number.parseFloat(codeLeading[2])
    if (KNOWN_CODES.has(code) && !Number.isNaN(amount)) {
      return {
        amount,
        amountCents: Math.round(amount * 100),
        currency: code,
        match: codeLeading[0],
      }
    }
  }

  const codeTrailing = normalized.match(
    /\b(\d+(?:\.\d{1,2})?)\s*([A-Za-z]{3})\b/,
  )
  if (codeTrailing) {
    const code = codeTrailing[2].toUpperCase()
    const amount = Number.parseFloat(codeTrailing[1])
    if (KNOWN_CODES.has(code) && !Number.isNaN(amount)) {
      return {
        amount,
        amountCents: Math.round(amount * 100),
        currency: code,
        match: codeTrailing[0],
      }
    }
  }

  return null
}

function extractDueDate(results: ChronoResult[]): DateDetection | null {
  if (results.length === 0) return null

  let target = results.find((result) => result.tags.quickAddDueDate)
  if (!target) {
    target = results[0]
  }

  const date = target.start?.date()
  if (!date) return null

  return {
    isoDate: toISODate(date),
    source: target.text,
  }
}

function extractDateRange(results: ChronoResult[]): DateRangeDetection | null {
  if (results.length === 0) return null

  let target = results.find((result) => result.end)
  if (!target) {
    target = results[0]
  }

  const start = target.start?.date()
  if (!start) return null

  const end = target.end?.date()
  const hasExplicitEnd = Boolean(target.tags.quickAddHasExplicitEnd)

  return {
    start: start.toISOString(),
    end: (end ?? addMinutes(start, 60)).toISOString(),
    source: target.text,
    hasExplicitEnd: Boolean(end) || hasExplicitEnd,
  }
}

function detectAmenity(text: string): AmenityMatch | null {
  for (const amenity of AMENITIES) {
    if (amenity.patterns.some((pattern) => pattern.test(text))) {
      return amenity
    }
  }
  return null
}

function detectPriority(text: string): "low" | "normal" | "high" | "urgent" {
  if (/urgent|asap|immediately/i.test(text)) return "urgent"
  if (/high priority|critical/i.test(text)) return "high"
  if (/low priority|minor/i.test(text)) return "low"
  return "normal"
}

function extractCounterparty(text: string): string | null {
  const match = text.match(/(?:for|from|to)\s+([A-Za-z][A-Za-z\s'-]{1,40})/i)
  return match ? match[1].trim() : null
}

function extractDescription(text: string): string | null {
  const afterFor = text.split(/(?:for|about)\s+/i)[1]
  if (afterFor) {
    return sentenceCase(afterFor.trim())
  }
  return null
}

function extractGuestName(text: string): string | null {
  const match = text.match(/(?:visitor|guest)\s+(?:named\s+)?([A-Za-z][A-Za-z\s'-]{1,40})/i)
  return match ? match[1].trim() : null
}

function extractEmail(text: string): string | null {
  const match = text.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/)
  return match ? match[1] : null
}

function extractPhone(text: string): string | null {
  const match = text.match(/(\+?\d[\d\s-]{7,}\d)/)
  return match ? match[1].replace(/\s+/g, " ").trim() : null
}

function extractPurpose(text: string): string | null {
  const match = text.match(/(?:for|about|regarding)\s+([A-Za-z][A-Za-z\s'-]{2,})/i)
  return match ? match[1].trim() : null
}

function toISODate(date: Date): string {
  const iso = date.toISOString()
  return iso.slice(0, 10)
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount)
  } catch (error) {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date)
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatTimeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const formatter = new Intl.DateTimeFormat("en", { timeStyle: "short" })
  return `${formatter.format(start)} – ${formatter.format(end)}`
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function titleCase(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

function sentenceCase(input: string): string {
  if (!input) return ""
  const lowered = input.trim().toLowerCase()
  return lowered.charAt(0).toUpperCase() + lowered.slice(1)
}
