import pRetry, { FailedAttemptError } from 'p-retry';

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';
export type FallbackReason = 'open' | 'error';

interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number;
  cooldownPeriod: number;
  halfOpenSuccessThreshold?: number;
  cacheTtlMs: number;
  maxRetries: number;
  timeoutMs: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  cachedAt: number;
}

export interface ExternalApiResult<T> {
  data: T;
  fromCache: boolean;
  breakerState: CircuitBreakerState;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecuteOptions<T> {
  cacheKey?: string;
  cacheResult?: boolean;
  cacheTtlMs?: number;
  allowFallback?: boolean;
  fallbackValue?: T;
  retries?: number;
  timeoutMs?: number;
  context?: Record<string, unknown>;
  onRetry?: (error: FailedAttemptError) => void;
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class CircuitBreaker {
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly cooldownPeriod: number;
  private readonly halfOpenSuccessThreshold: number;
  private readonly cacheTtlMs: number;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;

  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = 0;
  private lastError?: unknown;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = Math.max(options.failureThreshold, 1);
    this.cooldownPeriod = options.cooldownPeriod;
    this.halfOpenSuccessThreshold = Math.max(options.halfOpenSuccessThreshold ?? 1, 1);
    this.cacheTtlMs = options.cacheTtlMs;
    this.maxRetries = options.maxRetries;
    this.timeoutMs = options.timeoutMs;
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.nextAttempt,
      lastError: this.lastError,
    };
  }

  clearCache(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  async execute<T>(
    key: string,
    action: (attemptNumber: number) => Promise<T>,
    options: ExecuteOptions<T> = {}
  ): Promise<ExternalApiResult<T>> {
    const cacheKey = options.cacheKey ?? key;
    const allowFallback = options.allowFallback !== false;
    const retries = options.retries ?? this.maxRetries;
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;

    const now = Date.now();
    if (this.state === 'open') {
      if (now >= this.nextAttempt) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        const cached = allowFallback ? this.getCacheEntry<T>(cacheKey) : undefined;
        if (cached) {
          return {
            data: cached.value,
            fromCache: true,
            breakerState: this.state,
            error: `${this.name} circuit open`,
            metadata: this.buildMetadata(cacheKey, cached.cachedAt, 'open', options.context),
          };
        }

        if (allowFallback && options.fallbackValue !== undefined) {
          return {
            data: options.fallbackValue,
            fromCache: true,
            breakerState: this.state,
            error: `${this.name} circuit open`,
            metadata: this.buildMetadata(cacheKey, Date.now(), 'open', options.context),
          };
        }

        throw new CircuitOpenError(`${this.name} circuit is open. Skipping call for ${cacheKey}.`);
      }
    }

    try {
      const result = await pRetry(
        (attemptNumber) =>
          runWithTimeout(() => action(attemptNumber), timeoutMs, `${this.name}:${cacheKey}`),
        {
          retries,
          onFailedAttempt: (error) => {
            this.lastError = error;
            options.onRetry?.(error);
          },
        }
      );

      this.recordSuccess();

      if (options.cacheResult !== false) {
        this.setCacheEntry(cacheKey, result, options.cacheTtlMs);
      }

      return {
        data: result,
        fromCache: false,
        breakerState: this.state,
        metadata: this.buildMetadata(cacheKey, Date.now(), undefined, options.context),
      };
    } catch (error) {
      this.recordFailure();

      if (allowFallback) {
        const cached = this.getCacheEntry<T>(cacheKey);
        if (cached) {
          return {
            data: cached.value,
            fromCache: true,
            breakerState: this.state,
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: this.buildMetadata(cacheKey, cached.cachedAt, 'error', options.context),
          };
        }

        if (options.fallbackValue !== undefined) {
          return {
            data: options.fallbackValue,
            fromCache: true,
            breakerState: this.state,
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: this.buildMetadata(cacheKey, Date.now(), 'error', options.context),
          };
        }
      }

      throw error;
    }
  }

  private recordSuccess() {
    this.failureCount = 0;
    this.lastError = undefined;

    if (this.state === 'half-open') {
      this.successCount += 1;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.state = 'closed';
        this.successCount = 0;
      }
    } else {
      this.state = 'closed';
    }
  }

  private recordFailure() {
    this.failureCount += 1;

    if (this.state === 'half-open') {
      this.tripCircuit();
      return;
    }

    if (this.failureCount >= this.failureThreshold) {
      this.tripCircuit();
    }
  }

  private tripCircuit() {
    this.state = 'open';
    this.nextAttempt = Date.now() + this.cooldownPeriod;
    this.successCount = 0;
  }

  private setCacheEntry<T>(key: string, value: T, cacheTtl?: number) {
    const ttl = cacheTtl ?? this.cacheTtlMs;
    if (ttl <= 0) {
      return;
    }

    const entry: CacheEntry<T> = {
      value,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    this.cache.set(key, entry);
  }

  private getCacheEntry<T>(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return entry;
  }

  private buildMetadata(
    cacheKey: string,
    cachedAt: number,
    fallbackReason?: FallbackReason,
    context?: Record<string, unknown>
  ) {
    return {
      provider: this.name,
      cacheKey,
      cachedAt,
      fallbackReason,
      ...(context ?? {}),
    };
  }
}

async function runWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  descriptor: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`${descriptor} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    fn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
