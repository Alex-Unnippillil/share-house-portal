export const DEFAULT_CACHE_MAX_AGE = 0
export const DEFAULT_CACHE_S_MAXAGE = 60
export const DEFAULT_CACHE_STALE_WHILE_REVALIDATE = 300

export const DEFAULT_API_CACHE_CONTROL_HEADER = `public, max-age=${DEFAULT_CACHE_MAX_AGE}, s-maxage=${DEFAULT_CACHE_S_MAXAGE}, stale-while-revalidate=${DEFAULT_CACHE_STALE_WHILE_REVALIDATE}`

export interface ApiCacheControlOptions {
  maxAge?: number
  sMaxage?: number
  staleWhileRevalidate?: number
}

export function buildCacheControlHeader(
  options: ApiCacheControlOptions = {}
): string {
  const maxAge = options.maxAge ?? DEFAULT_CACHE_MAX_AGE
  const sMaxage = options.sMaxage ?? DEFAULT_CACHE_S_MAXAGE
  const staleWhileRevalidate =
    options.staleWhileRevalidate ?? DEFAULT_CACHE_STALE_WHILE_REVALIDATE

  return `public, max-age=${maxAge}, s-maxage=${sMaxage}, stale-while-revalidate=${staleWhileRevalidate}`
}

export function withApiCacheControl<T extends Response>(
  response: T,
  options?: ApiCacheControlOptions
): T {
  response.headers.set("Cache-Control", buildCacheControlHeader(options))
  return response
}
