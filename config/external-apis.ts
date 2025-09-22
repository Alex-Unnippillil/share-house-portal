import { z } from 'zod';

const numberSchema = z
  .string()
  .transform((value) => Number(value))
  .pipe(z.number().min(0))
  .optional();

function parseNumberEnv(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) {
    return fallback;
  }

  const result = numberSchema.safeParse(value.trim());
  if (!result.success) {
    console.warn(`Invalid value provided for ${key}. Using fallback ${fallback}.`);
    return fallback;
  }

  return result.data;
}

export interface ExternalApiBaseConfig {
  timeoutMs: number;
  maxRetries: number;
  failureThreshold: number;
  cooldownMs: number;
  cacheTtlMs: number;
  halfOpenSuccesses: number;
}

const defaults: ExternalApiBaseConfig = {
  timeoutMs: parseNumberEnv('EXTERNAL_API_TIMEOUT_MS', 10000),
  maxRetries: parseNumberEnv('EXTERNAL_API_MAX_RETRIES', 2),
  failureThreshold: parseNumberEnv('EXTERNAL_API_CIRCUIT_BREAKER_FAILURE_THRESHOLD', 3),
  cooldownMs: parseNumberEnv('EXTERNAL_API_CIRCUIT_BREAKER_COOLDOWN_MS', 60000),
  cacheTtlMs: parseNumberEnv('EXTERNAL_API_CACHE_TTL_MS', 5 * 60 * 1000),
  halfOpenSuccesses: parseNumberEnv('EXTERNAL_API_HALF_OPEN_SUCCESS_THRESHOLD', 1),
};

type ProviderKeys = keyof ExternalApiBaseConfig;

const providerOverrides: Record<ProviderKeys, string> = {
  timeoutMs: 'API_TIMEOUT_MS',
  maxRetries: 'API_MAX_RETRIES',
  failureThreshold: 'API_FAILURE_THRESHOLD',
  cooldownMs: 'API_COOLDOWN_MS',
  cacheTtlMs: 'API_CACHE_TTL_MS',
  halfOpenSuccesses: 'API_HALF_OPEN_SUCCESS_THRESHOLD',
};

function toEnvPrefix(provider: string): string {
  return provider
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
}

export function getExternalApiConfig(provider: string): ExternalApiBaseConfig {
  const prefix = toEnvPrefix(provider);

  const resolved: Partial<Record<ProviderKeys, number>> = {};

  (Object.keys(providerOverrides) as ProviderKeys[]).forEach((key) => {
    const envKey = `${prefix}_${providerOverrides[key]}`;
    const value = process.env[envKey];
    if (value) {
      const parsed = numberSchema.safeParse(value.trim());
      if (parsed.success) {
        resolved[key] = parsed.data;
      } else {
        console.warn(`Invalid value provided for ${envKey}. Using fallback ${defaults[key]}.`);
      }
    }
  });

  return {
    timeoutMs: resolved.timeoutMs ?? defaults.timeoutMs,
    maxRetries: resolved.maxRetries ?? defaults.maxRetries,
    failureThreshold: resolved.failureThreshold ?? defaults.failureThreshold,
    cooldownMs: resolved.cooldownMs ?? defaults.cooldownMs,
    cacheTtlMs: resolved.cacheTtlMs ?? defaults.cacheTtlMs,
    halfOpenSuccesses: resolved.halfOpenSuccesses ?? defaults.halfOpenSuccesses,
  };
}

export const externalApiDefaults = defaults;
