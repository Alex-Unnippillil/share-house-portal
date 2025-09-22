const DEFAULT_TIME_ZONE = 'America/Toronto'

interface IcsProperty {
  name: string
  params: Record<string, string>
  value: string
}

interface IcsDateDetails {
  date: string
  allDay: boolean
  tzid: string | null
  instant: string | null
  local: string | null
  raw: string
}

export interface TorontoWasteEvent {
  uid?: string
  summary: string
  description?: string | null
  date: string
  allDay: boolean
  startDateTime?: string | null
  tzid?: string | null
  materials: string[]
  raw: {
    dtstart: string
    dtend?: string
  }
}

export interface BuildTorontoWasteIcsUrlOptions {
  year?: number
  baseUrl?: string
}

export interface FetchTorontoWasteIcsOptions {
  year?: number
  overrideUrl?: string
  signal?: AbortSignal
}

export interface TorontoWasteRoommate {
  id: string
  full_name: string | null
  email: string | null
}

export function normalizeTorontoAddress(address: string): string {
  return address
    .trim()
    .replace(/[,#]/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function applyTemplate(base: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce((acc, [key, value]) => {
    const token = `{${key}}`
    if (acc.includes(token)) {
      return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }
    return acc
  }, base)
}

export function buildTorontoWasteIcsUrl(
  address: string,
  options: BuildTorontoWasteIcsUrlOptions = {}
): string {
  const trimmedAddress = address.trim()
  if (!trimmedAddress) {
    throw new Error('Address is required to build the Toronto waste ICS URL')
  }

  const template = options.baseUrl ?? process.env.TORONTO_WASTE_ICS_BASE_URL
  if (!template) {
    throw new Error(
      'TORONTO_WASTE_ICS_BASE_URL must be configured to ingest Toronto waste calendars'
    )
  }

  const year = options.year ?? new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIME_ZONE,
    year: 'numeric',
  })
    .format(new Date())
    .slice(0, 4)

  if (template.includes('{address}')) {
    return applyTemplate(template, {
      address: encodeURIComponent(trimmedAddress),
      year,
    })
  }

  const url = new URL(template)
  url.searchParams.set('address', trimmedAddress)
  if (!url.searchParams.has('year')) {
    url.searchParams.set('year', year)
  }
  if (!url.searchParams.has('format')) {
    url.searchParams.set('format', 'ics')
  }

  return url.toString()
}

export async function fetchTorontoWasteIcs(
  address: string,
  options: FetchTorontoWasteIcsOptions = {}
): Promise<{ ics: string; url: string }> {
  const targetUrl = options.overrideUrl
    ? options.overrideUrl
    : buildTorontoWasteIcsUrl(address, { year: options.year })

  const response = await fetch(targetUrl, {
    headers: {
      Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.1',
    },
    cache: 'no-cache',
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(`Failed to download Toronto waste ICS (${response.status})`)
  }

  const text = await response.text()
  if (!/BEGIN:VCALENDAR/i.test(text)) {
    throw new Error('Unexpected payload when downloading Toronto waste ICS')
  }

  return { ics: text, url: targetUrl }
}

export function parseTorontoWasteIcs(ics: string): TorontoWasteEvent[] {
  const lines = unfoldIcsLines(ics)
  const events: TorontoWasteEvent[] = []
  let current: Map<string, IcsProperty[]> | null = null

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (line === 'BEGIN:VEVENT') {
      current = new Map()
      continue
    }
    if (line === 'END:VEVENT') {
      if (current) {
        const event = buildEventFromProperties(current)
        if (event) {
          events.push(event)
        }
      }
      current = null
      continue
    }
    if (!current) {
      continue
    }

    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) {
      continue
    }

    const rawName = line.slice(0, colonIndex)
    const value = unescapeIcsValue(line.slice(colonIndex + 1))
    const [name, ...rawParams] = rawName.split(';')
    const params = rawParams.reduce<Record<string, string>>((acc, param) => {
      const [key, val] = param.split('=')
      if (key) {
        acc[key.toUpperCase()] = val ?? ''
      }
      return acc
    }, {})

    const property: IcsProperty = {
      name: name.toUpperCase(),
      params,
      value,
    }

    const existing = current.get(property.name)
    if (existing) {
      existing.push(property)
    } else {
      current.set(property.name, [property])
    }
  }

  return events
}

function buildEventFromProperties(props: Map<string, IcsProperty[]>): TorontoWasteEvent | null {
  const dtstart = props.get('DTSTART')?.[0]
  const summaryProp = props.get('SUMMARY')?.[0]
  if (!dtstart || !summaryProp) {
    return null
  }

  const dateDetails = parseIcsDate(dtstart)
  if (!dateDetails) {
    return null
  }

  const descriptionProp = props.get('DESCRIPTION') ?? []
  const categoriesProp = props.get('CATEGORIES') ?? []
  const dtend = props.get('DTEND')?.[0]
  const uid = props.get('UID')?.[0]?.value?.trim() || undefined

  const description = descriptionProp
    .map(property => property.value)
    .join('\n')
    .trim()

  const categories = categoriesProp
    .flatMap(property => splitCandidates(property.value))
    .filter(Boolean)

  const materials = deriveMaterials(summaryProp.value, description, categories)

  return {
    uid,
    summary: summaryProp.value.trim(),
    description: description || undefined,
    date: dateDetails.date,
    allDay: dateDetails.allDay,
    startDateTime: dateDetails.instant ?? dateDetails.local ?? null,
    tzid: dateDetails.tzid ?? undefined,
    materials,
    raw: {
      dtstart: dateDetails.raw,
      dtend: dtend?.value,
    },
  }
}

function unfoldIcsLines(ics: string): string[] {
  const sanitized = ics.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const lines: string[] = []

  for (const line of sanitized.split('\n')) {
    if (!line) {
      lines.push('')
      continue
    }

    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (lines.length === 0) {
        lines.push(line.slice(1))
      } else {
        lines[lines.length - 1] += line.slice(1)
      }
    } else {
      lines.push(line)
    }
  }

  return lines
}

function unescapeIcsValue(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

function parseIcsDate(property: IcsProperty): IcsDateDetails | null {
  const raw = property.value.trim()
  if (!raw) {
    return null
  }

  const tzid = property.params.TZID ?? null
  const valueType = property.params.VALUE?.toUpperCase() ?? null
  const dateOnlyCandidate = raw.length >= 8 ? raw.slice(0, 8) : raw

  const isoDate = toIsoDate(dateOnlyCandidate)
  if (!isoDate) {
    return null
  }

  if (valueType === 'DATE' || /^\d{8}$/.test(raw)) {
    return {
      date: isoDate,
      allDay: true,
      tzid,
      instant: null,
      local: null,
      raw,
    }
  }

  if (/^\d{8}T\d{6}Z$/.test(raw)) {
    const instant = parseUtcInstant(raw)
    return {
      date: instant.slice(0, 10),
      allDay: false,
      tzid: 'UTC',
      instant,
      local: null,
      raw,
    }
  }

  if (/^\d{8}T\d{6}$/.test(raw)) {
    const local = `${isoDate}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}`
    return {
      date: isoDate,
      allDay: false,
      tzid,
      instant: null,
      local,
      raw,
    }
  }

  return {
    date: isoDate,
    allDay: valueType === 'DATE',
    tzid,
    instant: null,
    local: raw.length >= 15 ? `${isoDate}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}` : null,
    raw,
  }
}

function parseUtcInstant(raw: string): string {
  const year = Number(raw.slice(0, 4))
  const month = Number(raw.slice(4, 6)) - 1
  const day = Number(raw.slice(6, 8))
  const hour = Number(raw.slice(9, 11))
  const minute = Number(raw.slice(11, 13))
  const second = Number(raw.slice(13, 15))

  return new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString()
}

function toIsoDate(compact: string): string | null {
  if (!/^\d{8}$/.test(compact)) {
    return null
  }
  const year = compact.slice(0, 4)
  const month = compact.slice(4, 6)
  const day = compact.slice(6, 8)
  return `${year}-${month}-${day}`
}

function deriveMaterials(
  summary: string,
  description?: string | null,
  categories: string[] = []
): string[] {
  const seen = new Map<string, string>()

  const addTokens = (
    source: string,
    options: { allowNew?: boolean; baseline?: Set<string> } = {}
  ) => {
    const { allowNew = true, baseline } = options
    for (const token of splitCandidates(source)) {
      const cleaned = token
        .trim()
        .replace(/[.;]+$/g, '')
        .replace(/\s+/g, ' ')
      if (!cleaned) {
        continue
      }
      const key = cleaned.toLowerCase()
      if (!allowNew && baseline && !baseline.has(key)) {
        continue
      }
      if (!seen.has(key)) {
        seen.set(key, cleaned)
      }
    }
  }

  addTokens(summary)
  for (const category of categories) {
    addTokens(category)
  }

  const baselineKeys = new Set(seen.keys())

  if (description) {
    addTokens(description, {
      allowNew: seen.size === 0,
      baseline: baselineKeys,
    })
  }

  return Array.from(seen.values())
}

function splitCandidates(source: string): string[] {
  return source
    .split(/[;,\n]/)
    .map(part => part.trim())
    .filter(Boolean)
}

export function makeWasteAssignmentKey(input: { date: string; summary: string }): string {
  return `${input.date}::${input.summary.trim().toLowerCase()}`
}

export function buildRotatingAssignments(
  events: Array<{ date: string; summary: string }>,
  roommates: TorontoWasteRoommate[]
): Map<string, TorontoWasteRoommate> {
  const assignment = new Map<string, TorontoWasteRoommate>()
  if (!roommates.length || !events.length) {
    return assignment
  }

  const sortedRoommates = [...roommates].sort((a, b) => {
    const labelA = (a.full_name ?? a.email ?? a.id).toLowerCase()
    const labelB = (b.full_name ?? b.email ?? b.id).toLowerCase()
    return labelA.localeCompare(labelB)
  })

  const sortedEvents = [...events].sort((a, b) => {
    if (a.date === b.date) {
      return a.summary.toLowerCase().localeCompare(b.summary.toLowerCase())
    }
    return a.date.localeCompare(b.date)
  })

  sortedEvents.forEach((event, index) => {
    const roommate = sortedRoommates[index % sortedRoommates.length]
    assignment.set(makeWasteAssignmentKey(event), roommate)
  })

  return assignment
}
