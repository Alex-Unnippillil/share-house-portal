const inFlightRequests = new Map<string, Promise<unknown>>();
const metricsByResource = new Map<string, { hits: number; misses: number }>();

export type CoalescingStatus = 'hit' | 'miss';

export interface CoalescingLogEvent<TParams = unknown> {
  resource: string;
  params: TParams;
  paramsFingerprint: string;
  status: CoalescingStatus;
  hits: number;
  misses: number;
  hitRate: number;
  inFlight: number;
}

export interface CoalescingOptions<TParams = unknown> {
  /**
   * Custom logger for instrumentation. Defaults to a console.info statement.
   */
  logger?: (event: CoalescingLogEvent<TParams>) => void;
}

const defaultLogger = (event: CoalescingLogEvent) => {
  const rate = Number.isFinite(event.hitRate) ? event.hitRate.toFixed(2) : '0.00';
  console.info(
    `[fetcher:coalesce] resource=${event.resource} status=${event.status} hitRate=${rate} hits=${event.hits} misses=${event.misses} inFlight=${event.inFlight} fingerprint=${event.paramsFingerprint}`
  );
};

const PARAMS_PLACEHOLDER = '::no-params::';
const KEY_SEPARATOR = '::';

function stableSerialize(value: unknown): string {
  if (value === undefined) {
    return PARAMS_PLACEHOLDER;
  }

  if (value === null) {
    return 'null';
  }

  const type = typeof value;

  if (type === 'string' || type === 'number' || type === 'boolean' || type === 'bigint') {
    return String(value);
  }

  if (value instanceof URLSearchParams) {
    return value.toString();
  }

  try {
    return JSON.stringify(value, (_key, nestedValue) => {
      if (typeof nestedValue === 'bigint') {
        return nestedValue.toString();
      }

      if (nestedValue instanceof URLSearchParams) {
        return nestedValue.toString();
      }

      return nestedValue;
    });
  } catch {
    return String(value);
  }
}

function fingerprint(serialized: string): string {
  let hash = 0;

  for (let index = 0; index < serialized.length; index += 1) {
    hash = Math.imul(31, hash) + serialized.charCodeAt(index);
    hash |= 0; // Convert to 32bit integer
  }

  return (hash >>> 0).toString(16);
}

function createMetrics(resource: string) {
  if (!metricsByResource.has(resource)) {
    metricsByResource.set(resource, { hits: 0, misses: 0 });
  }

  return metricsByResource.get(resource)!;
}

function countInFlight(resource: string) {
  let count = 0;

  for (const key of inFlightRequests.keys()) {
    if (key.startsWith(`${resource}${KEY_SEPARATOR}`)) {
      count += 1;
    }
  }

  return count;
}

function createCacheKey(resource: string, paramsKey: string) {
  return `${resource}${KEY_SEPARATOR}${paramsKey}`;
}

function emitLog<TParams>(
  resource: string,
  paramsKey: string,
  params: TParams,
  status: CoalescingStatus,
  options?: CoalescingOptions<TParams>
) {
  const metrics = metricsByResource.get(resource)!;
  const total = metrics.hits + metrics.misses;
  const hitRate = total === 0 ? 0 : metrics.hits / total;
  const logger = options?.logger ?? defaultLogger;

  const event: CoalescingLogEvent<TParams> = {
    resource,
    params,
    paramsFingerprint: fingerprint(paramsKey),
    status,
    hits: metrics.hits,
    misses: metrics.misses,
    hitRate,
    inFlight: countInFlight(resource),
  };

  logger(event);
}

/**
 * Coalesce concurrent fetches for a shared resource to avoid thundering herds.
 *
 * Subsequent calls with the same resource + params while a request is in-flight
 * receive the same promise. Once the promise settles it is removed from the cache.
 */
export async function withCoalescing<TResult, TParams = unknown>(
  resource: string,
  params: TParams,
  loader: () => Promise<TResult>,
  options?: CoalescingOptions<TParams>
): Promise<TResult> {
  const paramsKey = stableSerialize(params);
  const cacheKey = createCacheKey(resource, paramsKey);
  const metrics = createMetrics(resource);
  const inFlightPromise = inFlightRequests.get(cacheKey) as Promise<TResult> | undefined;

  if (inFlightPromise) {
    metrics.hits += 1;
    emitLog(resource, paramsKey, params, 'hit', options);
    return inFlightPromise;
  }

  metrics.misses += 1;

  let loaderPromise: Promise<TResult>;
  try {
    loaderPromise = Promise.resolve(loader());
  } catch (error) {
    // Ensure metrics stay consistent when the loader throws synchronously.
    emitLog(resource, paramsKey, params, 'miss', options);
    throw error;
  }

  const trackedPromise = loaderPromise.finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, trackedPromise);
  emitLog(resource, paramsKey, params, 'miss', options);

  return trackedPromise;
}

/**
 * Expose metrics for observability dashboards and testing.
 */
export function getCoalescingMetrics(resource?: string) {
  if (resource) {
    return metricsByResource.get(resource) ?? { hits: 0, misses: 0 };
  }

  return Array.from(metricsByResource.entries()).reduce<Record<string, { hits: number; misses: number }>>(
    (acc, [key, value]) => {
      acc[key] = { ...value };
      return acc;
    },
    {}
  );
}

/**
 * Clears tracked in-flight requests and metrics.
 * Useful for testing or when reloading modules in development.
 */
export function resetCoalescingState() {
  inFlightRequests.clear();
  metricsByResource.clear();
}
