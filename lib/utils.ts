import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

type ExtendedRequestInit = RequestInit & {
  retry?: number
  retryDelay?: number
  idempotencyKey?: string
}

const DEFAULT_RETRY_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY = 300
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429])

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const createErrorWithStatus = (message: string, status: number) => {
  const error = new Error(message) as Error & { status: number }
  error.status = status
  return error
}

const parseResponse = async <JSON>(res: Response): Promise<JSON> => {
  if (res.status === 204) {
    return undefined as JSON
  }

  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return (await res.json()) as JSON
  }

  const text = await res.text()
  return text as unknown as JSON
}

export async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: ExtendedRequestInit
): Promise<JSON> {
  const {
    retry = DEFAULT_RETRY_ATTEMPTS,
    retryDelay = DEFAULT_RETRY_DELAY,
    idempotencyKey: providedKey,
    ...fetchInit
  } = init ?? {}

  const method = (fetchInit.method ?? 'GET').toUpperCase()
  const idempotencyKey =
    method === 'POST'
      ? providedKey ?? createIdempotencyKey()
      : undefined

  let lastError: unknown

  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const headers = new Headers(fetchInit.headers ?? {})

      if (idempotencyKey && !headers.has('Idempotency-Key')) {
        headers.set('Idempotency-Key', idempotencyKey)
      }

      const response = await fetch(input, { ...fetchInit, headers })

      if (!response.ok) {
        const shouldRetry =
          RETRYABLE_STATUS_CODES.has(response.status) ||
          response.status >= 500

        let payload: unknown = null

        if (response.status !== 204) {
          try {
            payload = await response.clone().json()
          } catch (error) {
            payload = null
          }
        }

        const message =
          payload &&
          typeof payload === 'object' &&
          payload !== null &&
          'error' in payload &&
          typeof (payload as { error: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : `Request failed with status ${response.status}`

        const error = createErrorWithStatus(message, response.status)

        if (!shouldRetry || attempt === retry) {
          throw error
        }

        lastError = error
      } else {
        return await parseResponse<JSON>(response)
      }
    } catch (error) {
      lastError = error

      if (attempt === retry) {
        throw error
      }
    }

    const exponentialDelay = retryDelay * 2 ** attempt
    const jitter = exponentialDelay * 0.5 * Math.random()
    await sleep(exponentialDelay + jitter)
  }

  throw (lastError ?? new Error('Request failed'))
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

export const getStringFromBuffer = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

const normaliseValue = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => normaliseValue(item)).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${key}:${normaliseValue(val)}`)

  return `{${entries.join(',')}}`
}

export const stableHash = (value: unknown): string => {
  const input = typeof value === 'string' ? value : normaliseValue(value)

  let hash = 0

  for (let index = 0; index < input.length; index++) {
    hash = (hash << 5) - hash + input.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash).toString(16)
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