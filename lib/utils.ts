import { createHash } from "crypto"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

type TimestampInput = string | number | Date | null | undefined

export interface CollectionCacheSignature {
  count: number
  latestUpdatedAtMs: number
}

const fetchResponseCache = new Map<string, { etag: string; data: unknown }>()

export interface IntlPreferences {
  locale?: string | null
  timeZone?: string | null
}

const systemDefaultLocale = (() => {
  try {
    const { locale } = new Intl.DateTimeFormat().resolvedOptions()
    if (locale && locale.length > 0) {
      return locale
    }
  } catch (error) {
    // ignore and fallback below
  }

  return "en-US"
})()

const systemDefaultTimeZone = (() => {
  try {
    const { timeZone } = new Intl.DateTimeFormat().resolvedOptions()
    if (timeZone && timeZone.length > 0) {
      return timeZone
    }
  } catch (error) {
    // ignore and fallback below
  }

  return "UTC"
})()

const defaultDateFormat: Intl.DateTimeFormatOptions = {
  month: "long",
  day: "numeric",
  year: "numeric",
}

const defaultNumberFormat: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "USD",
}

const resolveLocale = (locale?: string | null): string => {
  if (typeof locale === "string" && locale.trim().length > 0) {
    return locale
  }

  return systemDefaultLocale
}

const resolveTimeZone = (timeZone?: string | null): string => {
  if (typeof timeZone === "string" && timeZone.trim().length > 0) {
    return timeZone
  }

  return systemDefaultTimeZone
}

const toTimestamp = (value: TimestampInput): number => {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : 0
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value)
    const time = parsed.getTime()
    return Number.isFinite(time) ? time : 0
  }

  return 0
}

export function getCollectionCacheSignature<
  T extends { updated_at?: TimestampInput }
>(
  rows: T[] | null | undefined,
  options?: { count?: number | null; fallbackUpdatedAt?: TimestampInput }
): CollectionCacheSignature {
  const count = options?.count ?? rows?.length ?? 0
  let latestUpdatedAtMs = 0

  for (const row of rows ?? []) {
    const timestamp = toTimestamp(row.updated_at)
    if (timestamp > latestUpdatedAtMs) {
      latestUpdatedAtMs = timestamp
    }
  }

  if (latestUpdatedAtMs === 0 && options?.fallbackUpdatedAt) {
    latestUpdatedAtMs = toTimestamp(options.fallbackUpdatedAt)
  }

  return {
    count,
    latestUpdatedAtMs,
  }
}

const createWeakEtag = (signature: CollectionCacheSignature): string => {
  const base = `${signature.count}:${signature.latestUpdatedAtMs}`
  const digest = createHash("sha1").update(base).digest("base64")
  const urlSafeDigest = digest
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")

  return `W/"${urlSafeDigest}"`
}

export function buildCollectionCacheMetadata<
  T extends { updated_at?: TimestampInput }
>(
  rows: T[] | null | undefined,
  options?: { count?: number | null; fallbackUpdatedAt?: TimestampInput }
): {
  etag: string
  count: number
  latestUpdatedAt: string | null
} {
  const signature = getCollectionCacheSignature(rows, options)
  const latestUpdatedAt =
    signature.latestUpdatedAtMs > 0
      ? new Date(signature.latestUpdatedAtMs).toISOString()
      : null

  return {
    etag: createWeakEtag(signature),
    count: signature.count,
    latestUpdatedAt,
  }
}

const resolveCacheKey = (
  input: RequestInfo | URL,
  init?: FetcherInit
): string | undefined => {
  if (init?.cacheKey) {
    return init.cacheKey
  }

  if (typeof input === "string") {
    return `${init?.method ?? "GET"}:${input}`
  }

  if (input instanceof URL) {
    return `${init?.method ?? "GET"}:${input.toString()}`
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return `${input.method}:${input.url}`
  }

  return undefined
}

export interface FetcherInit extends RequestInit {
  cacheKey?: string
  skipCache?: boolean
}

export const clearFetcherCache = () => {
  fetchResponseCache.clear()
}


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



export async function fetcher<JSON = any>(
  input: RequestInfo | URL,
  init?: FetcherInit
): Promise<JSON> {
  const cacheKey = init?.skipCache ? undefined : resolveCacheKey(input, init)
  const cachedEntry = cacheKey ? fetchResponseCache.get(cacheKey) : undefined

  const headers = new Headers(init?.headers ?? {})
  if (cachedEntry?.etag) {
    headers.set("If-None-Match", cachedEntry.etag)
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json")
  }

  const response = await fetch(input, { ...init, headers })

  if (response.status === 304) {
    if (cachedEntry) {
      return cachedEntry.data as JSON
    }

    throw new Error("Received 304 response without cached data")
  }

  let payload: any = null
  const contentType = response.headers.get("Content-Type") ?? ""
  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null)
  }

  if (!response.ok) {
    if (payload && typeof payload === "object" && "error" in payload) {
      const error = new Error((payload as { error: string }).error) as Error & {
        status: number
      }
      error.status = response.status
      throw error
    }

    const error = new Error("An unexpected error occurred") as Error & {
      status: number
    }
    error.status = response.status
    throw error
  }

  const etag = response.headers.get("ETag")
  if (cacheKey && etag) {
    fetchResponseCache.set(cacheKey, {
      etag,
      data: payload as JSON,
    })
  }

  return payload as JSON
}

export interface DateFormatOptions extends Intl.DateTimeFormatOptions, IntlPreferences {}

export function formatDate(
  input: string | number | Date,
  options?: DateFormatOptions,
): string {
  const date = new Date(input)
  if (!Number.isFinite(date.getTime())) {
    return ""
  }

  const { locale, timeZone, ...formatOverrides } = options ?? {}
  const resolvedLocale = resolveLocale(locale)
  const resolvedTimeZone = resolveTimeZone(timeZone)
  const formatOptions =
    Object.keys(formatOverrides).length > 0
      ? formatOverrides
      : defaultDateFormat

  try {
    return new Intl.DateTimeFormat(resolvedLocale, {
      timeZone: resolvedTimeZone,
      ...formatOptions,
    }).format(date)
  } catch (error) {
    return new Intl.DateTimeFormat(systemDefaultLocale, {
      timeZone: systemDefaultTimeZone,
      ...formatOptions,
    }).format(date)
  }
}

export interface NumberFormatOptions extends Intl.NumberFormatOptions {
  locale?: string | null
}

export const formatNumber = (
  value: number,
  options?: NumberFormatOptions,
) => {
  const { locale, ...formatOverrides } = options ?? {}
  const resolvedLocale = resolveLocale(locale)
  const formatOptions =
    Object.keys(formatOverrides).length > 0
      ? formatOverrides
      : defaultNumberFormat

  try {
    return new Intl.NumberFormat(resolvedLocale, formatOptions).format(value)
  } catch (error) {
    return new Intl.NumberFormat(systemDefaultLocale, formatOptions).format(value)
  }
}

const RELATIVE_TIME_THRESHOLDS: Array<{
  unit: Intl.RelativeTimeFormatUnit
  milliseconds: number
}> = [
  { unit: "year", milliseconds: 1000 * 60 * 60 * 24 * 365 },
  { unit: "month", milliseconds: 1000 * 60 * 60 * 24 * 30 },
  { unit: "week", milliseconds: 1000 * 60 * 60 * 24 * 7 },
  { unit: "day", milliseconds: 1000 * 60 * 60 * 24 },
  { unit: "hour", milliseconds: 1000 * 60 * 60 },
  { unit: "minute", milliseconds: 1000 * 60 },
  { unit: "second", milliseconds: 1000 },
]

export interface RelativeTimeFormatOptions extends IntlPreferences {
  now?: Date | number
  numeric?: Intl.RelativeTimeFormatOptions["numeric"]
  style?: Intl.RelativeTimeFormatOptions["style"]
}

export function formatRelativeTimeFromNow(
  input: string | number | Date,
  options?: RelativeTimeFormatOptions,
): string {
  const date = new Date(input)
  if (!Number.isFinite(date.getTime())) {
    return ""
  }

  const referenceTime = options?.now
    ? options.now instanceof Date
      ? options.now.getTime()
      : options.now
    : Date.now()

  const difference = date.getTime() - referenceTime
  const absoluteDifference = Math.abs(difference)

  const { locale, numeric = "auto", style = "long" } = options ?? {}
  const resolvedLocale = resolveLocale(locale)

  try {
    const formatter = new Intl.RelativeTimeFormat(resolvedLocale, {
      numeric,
      style,
    })

    for (const { unit, milliseconds } of RELATIVE_TIME_THRESHOLDS) {
      if (absoluteDifference >= milliseconds || unit === "second") {
        const value = Math.round(difference / milliseconds)
        return formatter.format(value, unit)
      }
    }
  } catch (error) {
    // ignore and fall through to fallback below
  }

  return "just now"
}

export const runAsyncFnWithoutBlocking = (
  fn: (...args: any) => Promise<any>
) => {
  fn()
}

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

export const getStringFromBuffer = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

export enum ResultCode {
  InvalidCredentials = 'INVALID_CREDENTIALS',
  InvalidSubmission = 'INVALID_SUBMISSION',
  UserAlreadyExists = 'USER_ALREADY_EXISTS',
  UnknownError = 'UNKNOWN_ERROR',
  UserCreated = 'USER_CREATED',
  UserLoggedIn = 'USER_LOGGED_IN'
}

export const getMessageFromCode = (resultCode: string) => {
  switch (resultCode) {
    case ResultCode.InvalidCredentials:
      return 'Invalid credentials!'
    case ResultCode.InvalidSubmission:
      return 'Invalid submission, please try again!'
    case ResultCode.UserAlreadyExists:
      return 'User already exists, please log in!'
    case ResultCode.UserCreated:
      return 'User created, welcome!'
    case ResultCode.UnknownError:
      return 'Something went wrong, please try again!'
    case ResultCode.UserLoggedIn:
      return 'Logged in!'
  }
}