import { unstable_cache as nextCache, revalidateTag as nextRevalidateTag } from 'next/cache';
import { createHash } from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';

const CACHE_NAMESPACE = 'roomsily:cache';
const TAG_NAMESPACE = 'roomsily:cache-tag';
const INVALIDATION_HISTORY_LIMIT = 50;

export const CACHE_TAGS = {
  documents: 'documents',
  documentStats: 'document-stats',
  bookings: 'bookings',
  notifications: 'notifications',
} as const;

type CacheInvalidationRecord = {
  tag: string;
  reason?: string;
  timestamp: number;
};

const invalidationHistory: CacheInvalidationRecord[] = [];

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

type RedisClient = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: { ex?: number }): Promise<'OK' | null>;
  del(...keys: string[]): Promise<number>;
  sadd(key: string, member: string): Promise<number>;
  smembers<T = string>(key: string): Promise<T[]>;
};

let redisClientPromise: Promise<RedisClient | null> | null = null;

async function getRedisClient(): Promise<RedisClient | null> {
  if (!redisUrl || !redisToken) {
    return null;
  }

  if (!redisClientPromise) {
    redisClientPromise = import('@upstash/redis')
      .then(({ Redis }) => new Redis({ url: redisUrl, token: redisToken }) as unknown as RedisClient)
      .catch((error) => {
        console.warn('[cache] Failed to initialise Upstash Redis client:', error);
        return null;
      });
  }

  return redisClientPromise;
}

type CachedEntry<T> = {
  value: T;
  expiresAt?: number;
  tags: string[];
};

type CacheOptions<TArgs extends any[]> = {
  keyParts: string[];
  tags: string[];
  ttl?: number;
  getCacheKey?: (...args: TArgs) => string;
};

const buildCacheKey = (key: string) => `${CACHE_NAMESPACE}:${key}`;
const buildTagKey = (tag: string) => `${TAG_NAMESPACE}:${tag}`;

const hashArgs = (args: unknown[]): string => {
  return createHash('sha1').update(JSON.stringify(args)).digest('hex');
};

export function createCachedLoader<TArgs extends any[], TResult>(
  loader: (...args: TArgs) => Promise<TResult>,
  options: CacheOptions<TArgs>
) {
  return nextCache(
    async (...args: TArgs) => {
      const cacheKeyInput = options.getCacheKey
        ? options.getCacheKey(...args)
        : hashArgs(args);
      const redisKey = buildCacheKey(`${options.keyParts.join(':')}:${cacheKeyInput}`);
      const redis = await getRedisClient();

      if (redis) {
        try {
          const cached = await redis.get<CachedEntry<TResult>>(redisKey);
          if (cached && (!cached.expiresAt || cached.expiresAt > Date.now())) {
            return cached.value;
          }
        } catch (error) {
          console.warn('[cache] Unable to read cached value from Upstash:', error);
        }
      }

      const value = await loader(...args);

      if (redis) {
        try {
          const entry: CachedEntry<TResult> = {
            value,
            tags: options.tags,
            expiresAt: options.ttl ? Date.now() + options.ttl * 1000 : undefined,
          };
          const ttlOptions = options.ttl ? { ex: options.ttl } : undefined;
          await redis.set(redisKey, entry, ttlOptions);
          await Promise.all(
            options.tags.map((tag) => redis.sadd(buildTagKey(tag), redisKey))
          );
        } catch (error) {
          console.warn('[cache] Unable to persist cached value to Upstash:', error);
        }
      }

      return value;
    },
    options.keyParts,
    { tags: options.tags }
  );
}

export async function invalidateCacheTag(tag: string, reason?: string) {
  const timestamp = Date.now();
  invalidationHistory.unshift({ tag, reason, timestamp });
  if (invalidationHistory.length > INVALIDATION_HISTORY_LIMIT) {
    invalidationHistory.length = INVALIDATION_HISTORY_LIMIT;
  }

  if (reason || process.env.NODE_ENV !== 'production') {
    console.info(`[cache] revalidating tag "${tag}"${reason ? ` due to ${reason}` : ''}`);
  }

  await nextRevalidateTag(tag);

  const redis = await getRedisClient();
  if (redis) {
    const tagKey = buildTagKey(tag);
    try {
      const keys = await redis.smembers<string>(tagKey);
      if (keys && keys.length > 0) {
        await redis.del(...keys);
      }
      await redis.del(tagKey);
    } catch (error) {
      console.warn('[cache] Unable to clear Upstash cache for tag', tag, error);
    }
  }
}

export function getCacheInvalidationLog(): CacheInvalidationRecord[] {
  return [...invalidationHistory];
}

export function createSupabaseClientWithToken(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return createSupabaseClient<Database>(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

