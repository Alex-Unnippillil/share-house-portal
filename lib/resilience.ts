import {
  BrokenCircuitError,
  CircuitState,
  ConsecutiveBreaker,
  ConstantBackoff,
  TaskCancelledError,
  TimeoutStrategy,
  circuitBreaker,
  handleAll,
  retry as createRetry,
  timeout as createTimeout,
  wrap,
} from 'cockatiel'

import {
  IntegrationTimeoutError,
  IntegrationUnavailableError,
} from '@/lib/errors'

const FALLBACK_NO_RESULT = Symbol('FALLBACK_NO_RESULT')

export interface ResilienceLogger {
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

const defaultLogger: ResilienceLogger = {
  info(message, meta) {
    if (meta) {
      console.info(message, meta)
    } else {
      console.info(message)
    }
  },
  warn(message, meta) {
    if (meta) {
      console.warn(message, meta)
    } else {
      console.warn(message)
    }
  },
  error(message, meta) {
    if (meta) {
      console.error(message, meta)
    } else {
      console.error(message)
    }
  },
}

export interface ResilienceManagerOptions {
  serviceName: string
  timeoutMs?: number
  breakerThreshold?: number
  halfOpenAfterMs?: number
  retryAttempts?: number
  retryBackoffMs?: number
  queueLimit?: number
  maxQueueAttempts?: number
  logger?: ResilienceLogger
}

export interface ResilienceFallbackContext {
  serviceName: string
  operationName: string
  error: unknown
  queued: boolean
  jobId?: string
  timedOut: boolean
  metadata?: Record<string, unknown>
}

export interface ResilienceExecuteOptions<T> {
  fallback?: (context: ResilienceFallbackContext) => Promise<T> | T
  queueOnOpen?: boolean
  metadata?: Record<string, unknown>
}

interface QueueItem {
  id: string
  operationName: string
  fn: () => Promise<unknown>
  attempts: number
  metadata?: Record<string, unknown>
}

export class ResilienceManager {
  private readonly serviceName: string
  private readonly timeoutMs: number
  private readonly breakerThreshold: number
  private readonly halfOpenAfterMs: number
  private readonly retryAttempts: number
  private readonly retryBackoffMs: number
  private readonly queueLimit: number
  private readonly maxQueueAttempts: number
  private readonly logger: ResilienceLogger
  private readonly breaker: ReturnType<typeof circuitBreaker>
  private readonly timeoutPolicy: ReturnType<typeof createTimeout>
  private readonly retryPolicy: ReturnType<typeof createRetry>
  private readonly policy: ReturnType<typeof wrap>
  private readonly queue: QueueItem[] = []
  private draining = false
  private jobCounter = 0

  constructor(options: ResilienceManagerOptions) {
    this.serviceName = options.serviceName
    this.timeoutMs = options.timeoutMs ?? 8000
    this.breakerThreshold = options.breakerThreshold ?? 3
    this.halfOpenAfterMs = options.halfOpenAfterMs ?? 15000
    this.retryAttempts = options.retryAttempts ?? 2
    this.retryBackoffMs = options.retryBackoffMs ?? 500
    this.queueLimit = options.queueLimit ?? 25
    this.maxQueueAttempts = options.maxQueueAttempts ?? 3
    this.logger = options.logger ?? defaultLogger

    this.breaker = circuitBreaker(handleAll, {
      breaker: new ConsecutiveBreaker(this.breakerThreshold),
      halfOpenAfter: this.halfOpenAfterMs,
    })
    this.timeoutPolicy = createTimeout(this.timeoutMs, {
      strategy: TimeoutStrategy.Aggressive,
    })
    const effectiveAttempts = Math.max(1, this.retryAttempts)
    this.retryPolicy = createRetry(handleAll, {
      maxAttempts: effectiveAttempts,
      backoff: new ConstantBackoff(this.retryBackoffMs),
    })
    this.policy = wrap(this.timeoutPolicy, this.retryPolicy, this.breaker)

    this.breaker.onStateChange((state) => {
      this.log('warn', `circuit state changed to ${CircuitState[state] ?? state}`, {
        state,
        queueSize: this.queue.length,
      })
      if (state === CircuitState.Closed || state === CircuitState.HalfOpen) {
        void this.flushQueue('state-change')
      }
    })

    this.breaker.onBreak((reason) => {
      this.log('error', 'circuit opened', {
        reason: this.describeFailureReason(reason),
        queueSize: this.queue.length,
      })
    })

    this.breaker.onReset(() => {
      this.log('info', 'circuit reset', {
        queueSize: this.queue.length,
      })
    })
  }

  get queueSize(): number {
    return this.queue.length
  }

  async execute<T>(
    operationName: string,
    fn: () => Promise<T> | T,
    options: ResilienceExecuteOptions<T> = {}
  ): Promise<T> {
    const queueOnOpen = options.queueOnOpen ?? true

    try {
      return await this.policy.execute(() => Promise.resolve(fn()))
    } catch (error) {
      if (error instanceof BrokenCircuitError) {
        const jobId = queueOnOpen ? this.enqueue(operationName, fn, options.metadata) : undefined
        const fallbackResult = await this.runFallback(options.fallback, {
          error,
          jobId,
          queued: queueOnOpen && !!jobId,
          operationName,
          serviceName: this.serviceName,
          timedOut: false,
          metadata: options.metadata,
        })

        if (fallbackResult !== FALLBACK_NO_RESULT) {
          return fallbackResult as T
        }

        throw new IntegrationUnavailableError(
          this.serviceName,
          operationName,
          this.buildUnavailableMessage(operationName, queueOnOpen && !!jobId, jobId),
          {
            jobId,
            cause: error,
            queued: queueOnOpen && !!jobId,
            extra: options.metadata,
          }
        )
      }

      if (error instanceof TaskCancelledError) {
        const fallbackResult = await this.runFallback(options.fallback, {
          error,
          jobId: undefined,
          queued: false,
          operationName,
          serviceName: this.serviceName,
          timedOut: true,
          metadata: options.metadata,
        })

        if (fallbackResult !== FALLBACK_NO_RESULT) {
          return fallbackResult as T
        }

        throw new IntegrationTimeoutError(
          this.serviceName,
          operationName,
          this.timeoutMs,
          {
            cause: error,
            extra: options.metadata,
          }
        )
      }

      this.log('error', `operation ${operationName} failed`, {
        error: error instanceof Error ? error.message : String(error),
        metadata: options.metadata,
      })

      const fallbackResult = await this.runFallback(options.fallback, {
        error,
        jobId: undefined,
        queued: false,
        operationName,
        serviceName: this.serviceName,
        timedOut: false,
        metadata: options.metadata,
      })

      if (fallbackResult !== FALLBACK_NO_RESULT) {
        return fallbackResult as T
      }

      throw error
    }
  }

  private async runFallback<T>(
    fallback: ResilienceExecuteOptions<T>['fallback'],
    context: ResilienceFallbackContext
  ): Promise<T | typeof FALLBACK_NO_RESULT> {
    if (!fallback) {
      return FALLBACK_NO_RESULT
    }

    try {
      return await Promise.resolve(fallback(context))
    } catch (fallbackError) {
      this.log('error', 'fallback handler threw an error', {
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        operationName: context.operationName,
      })
      throw fallbackError
    }
  }

  private enqueue<T>(
    operationName: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, unknown>
  ): string | undefined {
    if (this.queue.length >= this.queueLimit) {
      this.log('error', 'queue limit reached; dropping operation', {
        operationName,
        queueLimit: this.queueLimit,
      })
      return undefined
    }

    const id = `${this.serviceName}-${Date.now()}-${++this.jobCounter}`
    this.queue.push({
      id,
      operationName,
      attempts: 0,
      fn: () => Promise.resolve(fn()),
      metadata,
    })

    this.log('warn', 'operation queued for retry', {
      jobId: id,
      operationName,
      queueSize: this.queue.length,
      metadata,
    })

    return id
  }

  private async flushQueue(trigger: string) {
    if (this.draining || this.queue.length === 0) {
      return
    }

    this.draining = true
    this.log('info', 'draining queued operations', {
      trigger,
      queueSize: this.queue.length,
    })

    const pending = [...this.queue]
    this.queue.length = 0

    for (const item of pending) {
      try {
        await this.policy.execute(() => item.fn())
        this.log('info', 'queued operation completed', {
          jobId: item.id,
          operationName: item.operationName,
        })
      } catch (error) {
        item.attempts += 1
        if (
          (error instanceof BrokenCircuitError || error instanceof TaskCancelledError) &&
          item.attempts <= this.maxQueueAttempts
        ) {
          this.log('warn', 'queued operation re-queued', {
            jobId: item.id,
            operationName: item.operationName,
            attempts: item.attempts,
          })
          this.queue.push(item)
          break
        }

        this.log('error', 'queued operation failed permanently', {
          jobId: item.id,
          operationName: item.operationName,
          attempts: item.attempts,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    this.draining = false
  }

  private buildUnavailableMessage(
    operationName: string,
    queued: boolean,
    jobId?: string
  ): string {
    if (queued && jobId) {
      return `${this.serviceName} circuit is open for ${operationName}. Operation queued as ${jobId}.`
    }

    return `${this.serviceName} circuit is open for ${operationName}.`
  }

  private describeFailureReason(reason: unknown): Record<string, unknown> {
    if (
      typeof reason === 'object' &&
      reason !== null &&
      'error' in reason &&
      (reason as any).error instanceof Error
    ) {
      return { message: (reason as any).error.message }
    }

    if (typeof reason === 'object' && reason !== null && 'value' in reason) {
      return { value: (reason as any).value }
    }

    if (typeof reason === 'object' && reason !== null && 'isolated' in reason) {
      return { isolated: true }
    }

    return { message: String(reason) }
  }

  private log(
    level: keyof ResilienceLogger,
    message: string,
    meta?: Record<string, unknown>
  ) {
    const logger = this.logger[level]
    logger(`[Resilience:${this.serviceName}] ${message}`, meta)
  }
}

