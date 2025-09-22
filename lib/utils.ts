import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



type FetchCacheEntry = {
  etag: string
  payload: unknown
}

const etagCache = new Map<string, FetchCacheEntry>()

const createCacheKey = (input: RequestInfo, init?: RequestInit) => {
  const method =
    (init?.method || (input instanceof Request ? input.method : "GET"))?.toUpperCase() ??
    "GET"

  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url

  return `${method}:${url}`
}

const ensureHeaders = (init?: RequestInit) => {
  const headers = new Headers(init?.headers)
  return { ...init, headers }
}

export async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> {
  const cacheKey = createCacheKey(input, init)
  const cached = etagCache.get(cacheKey)

  const requestInit = ensureHeaders(init)

  if (cached) {
    requestInit.headers.set("If-None-Match", cached.etag)
  }

  const res = await fetch(input, requestInit)

  if (res.status === 304) {
    if (cached) {
      return cached.payload as JSON
    }

    throw new Error("Cached response unavailable for 304 Not Modified.")
  }

  if (!res.ok) {
    let json: any = null
    try {
      json = await res.json()
    } catch (error) {
      // Ignore JSON parsing issues for error responses without bodies
    }

    if (json?.error) {
      const error = new Error(json.error) as Error & {
        status: number
      }
      error.status = res.status
      throw error
    }

    throw new Error("An unexpected error occurred")
  }

  const data = (await res.json()) as JSON
  const etag = res.headers.get("ETag")

  if (etag) {
    etagCache.set(cacheKey, { etag, payload: data })
  } else if (etagCache.has(cacheKey)) {
    etagCache.delete(cacheKey)
  }

  return data
}

export const clearFetcherCache = () => {
  etagCache.clear()
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