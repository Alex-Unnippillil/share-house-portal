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

export class RetryExhaustedError extends Error {
  attempts: number

  constructor(message: string, attempts: number, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined)
    this.name = "RetryExhaustedError"
    this.attempts = attempts
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

export function isLikelyTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

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
        throw new RetryExhaustedError(
          error instanceof Error ? error.message : "Retry attempts exhausted",
          attempt,
          error
        )
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

export function providerOutageMessage(provider: "stripe" | "calcom" | "documenso") {
  if (provider === "stripe") {
    return "Payments are temporarily unavailable. Please try again shortly or use the billing portal later."
  }

  if (provider === "calcom") {
    return "Amenity scheduling is temporarily degraded. Your request was not confirmed yet—please retry in a few minutes."
  }

  return "Document signing is temporarily unavailable. Your lease draft is saved and you can retry sending for signature shortly."
}
