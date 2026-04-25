export interface RetryOptions {
  retries: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  shouldRetry?: (error: unknown, attempt: number) => boolean
  jitter?: boolean
}

export interface RetryResult<T> {
  value: T
  attempts: number
}

export interface CircuitState {
  failures: number
  openedAt?: number
}

export interface ResilientRequestOptions extends RetryOptions {
  provider: string
  operation: string
  timeoutMs?: number
  circuitFailureThreshold?: number
  circuitResetMs?: number
  onCircuitOpen?: (input: { provider: string; operation: string; failures: number }) => void
}

const circuitRegistry = new Map<string, CircuitState>()

export class RetryExhaustedError extends Error {
  attempts: number

  constructor(message: string, attempts: number, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined)
    this.name = "RetryExhaustedError"
    this.attempts = attempts
  }
}

export class OperationTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(provider: string, operation: string, timeoutMs: number, cause?: unknown) {
    super(
      `${provider} ${operation} timed out after ${timeoutMs}ms`,
      cause !== undefined ? { cause } : undefined
    )
    this.name = "OperationTimeoutError"
    this.timeoutMs = timeoutMs
  }
}

export class CircuitOpenError extends Error {
  readonly retryAfterMs: number

  constructor(provider: string, operation: string, retryAfterMs: number) {
    super(`${provider} ${operation} blocked because circuit is open`)
    this.name = "CircuitOpenError"
    this.retryAfterMs = retryAfterMs
  }
}

export class UpstreamHttpError extends Error {
  readonly status: number

  constructor(provider: string, operation: string, status: number, message: string, cause?: unknown) {
    super(`${provider} ${operation} failed with HTTP ${status}: ${message}`, cause !== undefined ? { cause } : undefined)
    this.name = "UpstreamHttpError"
    this.status = status
  }
}

export async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function toDelay(attempt: number, options: RetryOptions) {
  const initial = options.initialDelayMs ?? 300
  const max = options.maxDelayMs ?? 5_000
  const multiplier = options.backoffMultiplier ?? 2
  const base = Math.min(initial * multiplier ** (attempt - 1), max)

  if (!options.jitter) {
    return base
  }

  return Math.floor(base / 2 + Math.random() * (base / 2))
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export function isLikelyTransientError(error: unknown): boolean {
  if (error instanceof UpstreamHttpError) {
    return error.status === 429 || (error.status >= 500 && error.status <= 504)
  }

  if (error instanceof OperationTimeoutError) {
    return true
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes("timed out") ||
      message.includes("timeout") ||
      message.includes("temporarily unavailable") ||
      message.includes("rate limit") ||
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("429") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    )
  }

  return false
}

async function withTimeout<T>(operation: () => Promise<T>, timeoutMs: number, provider: string, name: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new OperationTimeoutError(provider, name, timeoutMs))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<RetryResult<T>> {
  let attempt = 0

  while (attempt <= options.retries) {
    attempt += 1

    try {
      const value = await operation()
      return { value, attempts: attempt }
    } catch (error) {
      const isLastAttempt = attempt > options.retries
      if (isLastAttempt) {
        throw new RetryExhaustedError(normalizeErrorMessage(error), attempt, error)
      }

      const retryable = options.shouldRetry
        ? options.shouldRetry(error, attempt)
        : isLikelyTransientError(error)

      if (!retryable) {
        throw error
      }

      await wait(toDelay(attempt, options))
    }
  }

  throw new RetryExhaustedError("retryWithBackoff exhausted unexpectedly", options.retries + 1)
}

function circuitKey(provider: string, operation: string): string {
  return `${provider}:${operation}`
}

function getCircuitState(provider: string, operation: string): CircuitState {
  return circuitRegistry.get(circuitKey(provider, operation)) ?? { failures: 0 }
}

function setCircuitState(provider: string, operation: string, state: CircuitState) {
  circuitRegistry.set(circuitKey(provider, operation), state)
}

function ensureCircuitClosed(options: ResilientRequestOptions) {
  const state = getCircuitState(options.provider, options.operation)
  const resetMs = options.circuitResetMs ?? 15_000

  if (!state.openedAt) {
    return
  }

  const retryAfterMs = resetMs - (Date.now() - state.openedAt)

  if (retryAfterMs <= 0) {
    setCircuitState(options.provider, options.operation, { failures: 0 })
    return
  }

  throw new CircuitOpenError(options.provider, options.operation, retryAfterMs)
}

function markFailure(options: ResilientRequestOptions) {
  const threshold = options.circuitFailureThreshold ?? 5
  const state = getCircuitState(options.provider, options.operation)
  const failures = state.failures + 1

  if (failures >= threshold) {
    const nextState = { failures, openedAt: Date.now() }
    setCircuitState(options.provider, options.operation, nextState)
    options.onCircuitOpen?.({
      provider: options.provider,
      operation: options.operation,
      failures,
    })
    return
  }

  setCircuitState(options.provider, options.operation, {
    failures,
    openedAt: state.openedAt,
  })
}

function markSuccess(options: ResilientRequestOptions) {
  setCircuitState(options.provider, options.operation, { failures: 0 })
}

export async function resilientRequest<T>(
  operation: () => Promise<T>,
  options: ResilientRequestOptions
): Promise<RetryResult<T>> {
  ensureCircuitClosed(options)

  const timeoutMs = options.timeoutMs ?? 6_000

  try {
    const result = await retryWithBackoff(
      () => withTimeout(operation, timeoutMs, options.provider, options.operation),
      options
    )
    markSuccess(options)
    return result
  } catch (error) {
    if (isLikelyTransientError(error) || error instanceof RetryExhaustedError) {
      markFailure(options)
    }

    throw error
  }
}



export function resetResilienceState() {
  circuitRegistry.clear()
}

export function providerOutageMessage(provider: "stripe" | "calcom" | "documenso" | "resend") {
  if (provider === "stripe") {
    return "Payments are temporarily unavailable. Please try again shortly or use the billing portal later."
  }

  if (provider === "calcom") {
    return "Amenity scheduling is temporarily degraded. Your request was not confirmed yet—please retry in a few minutes."
  }

  if (provider === "resend") {
    return "Notifications are delayed because the email service is temporarily unavailable."
  }

  return "Document signing is temporarily unavailable. Your lease draft is saved and you can retry sending for signature shortly."
}
