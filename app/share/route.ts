import { NextResponse } from "next/server"

type ParsedCalendarEvent = {
  summary?: string
  description?: string
  location?: string
  start?: string
  end?: string
}

type BookingShareDetails = {
  amenityId?: string
  start?: string
  end?: string
  summary?: string
  notes?: string
  sourceUrl?: string
}

const AMENITY_KEYWORDS: Record<string, string[]> = {
  kitchen: ["kitchen", "cook", "meal prep"],
  "tv-room": ["tv room", "tv-room", "television", "living room"],
  playstation: ["playstation", "gaming", "console"],
  parking: ["parking", "garage", "visitor parking"],
  computer: ["computer", "workstation", "desktop"],
}

function extractString(entry: FormDataEntryValue | null): string | undefined {
  if (typeof entry !== "string") return undefined
  const value = entry.trim()
  return value.length > 0 ? value : undefined
}

function extractFiles(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((item): item is File => item instanceof File && item.size > 0)
}

function normaliseIsoInput(value: string | undefined): string | undefined {
  if (!value) return undefined
  const parsed = parseICalDate(value)
  if (parsed) return parsed

  const isoCandidate = value.includes(" ") ? value.replace(" ", "T") : value
  const date = new Date(isoCandidate)
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString()
  }

  return undefined
}

function extractDateTimesFromText(text?: string): { start?: string; end?: string } {
  if (!text) return {}

  const matches: string[] = []
  const isoPattern = /\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?/g
  let match: RegExpExecArray | null
  while ((match = isoPattern.exec(text)) !== null) {
    matches.push(match[0])
    if (matches.length === 2) break
  }

  const results: { start?: string; end?: string } = {}
  if (matches[0]) {
    results.start = normaliseIsoInput(matches[0])
  }
  if (matches[1]) {
    results.end = normaliseIsoInput(matches[1])
  }

  if (!results.start || !results.end) {
    const icsPattern = /\d{8}T\d{6}Z?/g
    const rawTokens = text.match(icsPattern) ?? []
    if (!results.start && rawTokens[0]) {
      results.start = parseICalDate(rawTokens[0])
    }
    if (!results.end && rawTokens[1]) {
      results.end = parseICalDate(rawTokens[1])
    }
  }

  return results
}

function detectAmenityId(...sources: Array<string | undefined>): string | undefined {
  const haystacks = sources
    .filter((source): source is string => Boolean(source && source.trim().length > 0))
    .map((value) => value.toLowerCase())

  for (const [amenityId, keywords] of Object.entries(AMENITY_KEYWORDS)) {
    for (const haystack of haystacks) {
      if (keywords.some((keyword) => haystack.includes(keyword))) {
        return amenityId
      }
    }
  }

  return undefined
}

function looksLikeBooking(text?: string, url?: string): boolean {
  const combined = `${text ?? ""} ${url ?? ""}`.toLowerCase()
  return /booking|reservation|amenity|calendar/.test(combined)
}

function parseICalendar(payload: string): ParsedCalendarEvent {
  const lines = payload.split(/\r?\n/)
  const record: Record<string, string> = {}

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith("BEGIN") || line.startsWith("END")) continue
    const separatorIndex = line.indexOf(":")
    if (separatorIndex === -1) continue
    const key = line.slice(0, separatorIndex)
    const value = line.slice(separatorIndex + 1)
    record[key] = value
  }

  const summary = selectField(record, "SUMMARY")
  const description = selectField(record, "DESCRIPTION")
  const location = selectField(record, "LOCATION")
  const start = parseICalDate(selectField(record, "DTSTART"))
  const end = parseICalDate(selectField(record, "DTEND"))

  return { summary, description, location, start, end }
}

function selectField(record: Record<string, string>, field: string): string | undefined {
  if (record[field]) return record[field]
  const matchingKey = Object.keys(record).find((key) => key.startsWith(`${field};`))
  if (!matchingKey) return undefined
  return record[matchingKey]
}

function parseICalDate(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const token = trimmed.includes(":") ? trimmed.split(":").pop() ?? trimmed : trimmed
  const basicMatch = token.match(/^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})(Z)?)?$/)

  if (basicMatch) {
    const [, year, month, day, , hour = "00", minute = "00", second = "00", suffix] = basicMatch
    const yearNum = Number(year)
    const monthNum = Number(month) - 1
    const dayNum = Number(day)
    const hourNum = Number(hour)
    const minuteNum = Number(minute)
    const secondNum = Number(second)

    const date = suffix === "Z"
      ? new Date(Date.UTC(yearNum, monthNum, dayNum, hourNum, minuteNum, secondNum))
      : new Date(yearNum, monthNum, dayNum, hourNum, minuteNum, secondNum)

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString()
    }
  }

  const isoCandidate = token.includes(" ") ? token.replace(" ", "T") : token
  const parsed = new Date(isoCandidate)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString()
  }

  return undefined
}

function buildBookingShareDetails(args: {
  calendarEvent?: ParsedCalendarEvent
  title?: string
  text?: string
  url?: string
}): BookingShareDetails {
  const { calendarEvent, title, text, url } = args
  const derivedTimes = extractDateTimesFromText(text)

  const start = calendarEvent?.start ?? derivedTimes.start
  const end = calendarEvent?.end ?? derivedTimes.end
  const summary = calendarEvent?.summary ?? title
  const description = calendarEvent?.description ?? text
  const amenityId = detectAmenityId(summary, description, calendarEvent?.location, text, title)

  return {
    amenityId,
    start,
    end,
    summary,
    notes: description ?? undefined,
    sourceUrl: url,
  }
}

function redirectWithParams(request: Request, path: string, params: URLSearchParams) {
  const destination = new URL(path, request.url)
  destination.search = params.toString()
  return NextResponse.redirect(destination)
}

export async function POST(request: Request) {
  const formData = await request.formData()

  const title = extractString(formData.get("title"))
  const text = extractString(formData.get("text"))
  const url = extractString(formData.get("url"))
  const documentFiles = extractFiles(formData, "documents")
  const calendarFiles = extractFiles(formData, "calendar")

  const hasCalendar = calendarFiles.length > 0
  const treatAsBooking = hasCalendar || (documentFiles.length === 0 && looksLikeBooking(text, url))

  if (treatAsBooking) {
    const calendarEvent = hasCalendar ? parseICalendar(await calendarFiles[0].text()) : undefined
    const details = buildBookingShareDetails({ calendarEvent, title, text, url })

    const params = new URLSearchParams()
    params.set("shareIntent", "booking")
    if (details.amenityId) params.set("shareAmenity", details.amenityId)
    if (details.start) params.set("shareStart", details.start)
    if (details.end) params.set("shareEnd", details.end)
    if (details.summary) params.set("shareTitle", details.summary)
    if (details.notes) params.set("shareNotes", details.notes)
    if (details.sourceUrl) params.set("shareUrl", details.sourceUrl)

    return redirectWithParams(request, "/bookings", params)
  }

  const params = new URLSearchParams()
  params.set("shareIntent", "document")
  if (title) params.set("shareTitle", title)
  if (text) params.set("shareDescription", text)
  if (url) params.set("shareUrl", url)
  const firstDocument = documentFiles[0]
  if (firstDocument) params.set("shareFileName", firstDocument.name)

  return redirectWithParams(request, "/documents", params)
}

export function GET(request: Request) {
  return NextResponse.redirect(new URL("/", request.url))
}
