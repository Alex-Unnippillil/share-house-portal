import { createHash } from "crypto"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

type TimestampInput = string | number | Date | null | undefined

export interface CollectionCacheSignature {
  count: number
  latestUpdatedAtMs: number
}

const fetchResponseCache = new Map<string, { etag: string; data: unknown }>()

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

export function formatDate(input: string | number | Date): string {
  const date = new Date(input)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)

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

const DEFAULT_REDACTED_KEYS = [
  "authorization",
  "token",
  "secret",
  "password",
  "key",
  "credential",
  "signature",
  "session",
  "cookie",
  "ssn",
  "card",
  "account",
  "routing",
  "dob",
  "pin",
  "fingerprint",
] as const

const DEFAULT_MASK_CHARACTER = "•"

const NORMALIZE_KEY_REGEX = /[^a-z0-9]/gi

const normalizeKey = (key: string) => key.trim().toLowerCase()

const tokenizeKey = (key: string) =>
  key
    .toLowerCase()
    .split(NORMALIZE_KEY_REGEX)
    .filter(Boolean)

const shouldRedactKey = (
  key: string,
  sensitiveKeys: Set<string>,
  includePartialMatches: boolean
) => {
  const normalized = normalizeKey(key)
  if (sensitiveKeys.has(normalized)) {
    return true
  }

  const sanitized = normalized.replace(NORMALIZE_KEY_REGEX, "")
  if (sanitized && sensitiveKeys.has(sanitized)) {
    return true
  }

  if (!includePartialMatches) {
    return false
  }

  const tokens = tokenizeKey(key)
  return tokens.some((token) => sensitiveKeys.has(token))
}

export type MaskSensitiveStringOptions = {
  maskChar?: string
  visibleStart?: number
  visibleEnd?: number
}

export function maskSensitiveString(
  value: string,
  options?: MaskSensitiveStringOptions
): string {
  const maskChar = options?.maskChar ?? DEFAULT_MASK_CHARACTER
  const visibleStart = Math.max(0, options?.visibleStart ?? 2)
  const visibleEnd = Math.max(0, options?.visibleEnd ?? 2)

  if (value.length === 0) {
    return ""
  }

  const totalVisible = visibleStart + visibleEnd
  if (value.length <= totalVisible) {
    return maskChar.repeat(value.length)
  }

  const start = value.slice(0, visibleStart)
  const end = value.slice(value.length - visibleEnd)
  const maskLength = Math.max(0, value.length - totalVisible)

  return `${start}${maskChar.repeat(maskLength)}${end}`
}

export type RedactSensitiveValuesOptions = {
  keys?: string[]
  maskChar?: string
  visibleStart?: number
  visibleEnd?: number
  includePartialMatches?: boolean
}

const REDACTED_PLACEHOLDER = "[REDACTED]"

const maskUnknownValue = (
  value: unknown,
  options: Required<Omit<RedactSensitiveValuesOptions, "keys" | "includePartialMatches">>
) => {
  if (typeof value === "string") {
    return maskSensitiveString(value, options)
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return maskSensitiveString(String(value), options)
  }

  if (value === null || value === undefined) {
    return REDACTED_PLACEHOLDER
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskUnknownValue(item, options))
  }

  return REDACTED_PLACEHOLDER
}

export function redactSensitiveValues<T>(
  input: T,
  options?: RedactSensitiveValuesOptions
): T {
  const sensitiveKeys = new Set(
    (options?.keys ?? DEFAULT_REDACTED_KEYS).map((key) => normalizeKey(key))
  )
  const maskChar = options?.maskChar ?? DEFAULT_MASK_CHARACTER
  const visibleStart = options?.visibleStart ?? 2
  const visibleEnd = options?.visibleEnd ?? 2
  const includePartialMatches = options?.includePartialMatches ?? true

  const seen = new WeakMap<object, unknown>()

  const visit = (value: unknown, parentKey?: string): unknown => {
    if (Array.isArray(value)) {
      return value.map((item) => visit(item, parentKey))
    }

    if (value && typeof value === "object") {
      if (seen.has(value as object)) {
        return seen.get(value as object) as unknown
      }

      const clone: Record<string, unknown> = {}
      seen.set(value as object, clone)

      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        if (shouldRedactKey(key, sensitiveKeys, includePartialMatches)) {
          clone[key] = maskUnknownValue(nested, {
            maskChar,
            visibleStart,
            visibleEnd,
          })
        } else {
          clone[key] = visit(nested, key)
        }
      }

      return clone
    }

    if (parentKey && shouldRedactKey(parentKey, sensitiveKeys, includePartialMatches)) {
      return maskUnknownValue(value, {
        maskChar,
        visibleStart,
        visibleEnd,
      })
    }

    return value
  }

  return visit(input) as T
}

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