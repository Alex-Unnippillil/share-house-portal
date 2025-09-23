import { NextResponse } from "next/server"

import type { LinkPreviewData } from "@/types/link-preview"

const PREVIEW_CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutes
const USER_AGENT =
  "Mozilla/5.0 (compatible; ShareHousePortal/1.0; +https://share-house.example)"

interface CachedPreview {
  data: LinkPreviewData
  expiresAt: number
}

declare global {
  // eslint-disable-next-line no-var
  var __linkPreviewCache: Map<string, CachedPreview> | undefined
}

const getPreviewCache = () => {
  if (!globalThis.__linkPreviewCache) {
    globalThis.__linkPreviewCache = new Map<string, CachedPreview>()
  }

  return globalThis.__linkPreviewCache
}

const decodeHtmlEntities = (input: string): string =>
  input
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")

const extractAttribute = (tag: string, name: string): string | null => {
  const regex = new RegExp(`${name}\\s*=\\s*(["'])((?:\\\\.|(?!\\1).)*)\\1`, "i")
  const match = tag.match(regex)
  if (!match) {
    return null
  }

  return decodeHtmlEntities(match[2]).trim()
}

const getMetaContent = (
  html: string,
  attribute: "property" | "name",
  value: string
): string | null => {
  const pattern = new RegExp(
    `<meta[^>]*${attribute}\\s*=\\s*(["'])${value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\1[^>]*>`,
    "i"
  )
  const match = html.match(pattern)
  if (!match) {
    return null
  }

  const contentMatch = match[0].match(/content\\s*=\\s*(["'])((?:\\\\.|(?!\\1).)*)\\1/i)
  if (!contentMatch) {
    return null
  }

  return decodeHtmlEntities(contentMatch[2]).trim()
}

const extractTitle = (html: string): string | null => {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match ? decodeHtmlEntities(match[1]).trim() : null
}

const cleanText = (value: string | null): string | null => {
  if (!value) {
    return null
  }

  const cleaned = value.replace(/\s+/g, " ").trim()
  if (!cleaned) {
    return null
  }

  return cleaned.length > 320 ? `${cleaned.slice(0, 317).trim()}…` : cleaned
}

const resolveAssetUrl = (value: string | null, baseUrl: URL): string | null => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  try {
    const resolved = new URL(trimmed, baseUrl)
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null
    }

    return resolved.toString()
  } catch (error) {
    return null
  }
}

const extractFavicon = (html: string, baseUrl: URL): string | null => {
  const linkMatches = html.match(/<link[^>]+>/gi) ?? []
  for (const tag of linkMatches) {
    const rel = extractAttribute(tag, "rel")
    if (!rel) {
      continue
    }

    const normalizedRel = rel.toLowerCase()
    if (!normalizedRel.includes("icon")) {
      continue
    }

    const href = extractAttribute(tag, "href")
    const sanitized = resolveAssetUrl(href, baseUrl)
    if (sanitized) {
      return sanitized
    }
  }

  return null
}

const buildPreviewFromHtml = (html: string, baseUrl: URL): LinkPreviewData => {
  const ogUrl = cleanText(getMetaContent(html, "property", "og:url"))
  const ogTitle = cleanText(getMetaContent(html, "property", "og:title"))
  const twitterTitle = cleanText(getMetaContent(html, "name", "twitter:title"))
  const ogDescription = cleanText(
    getMetaContent(html, "property", "og:description")
  )
  const twitterDescription = cleanText(
    getMetaContent(html, "name", "twitter:description")
  )
  const metaDescription = cleanText(getMetaContent(html, "name", "description"))
  const ogSiteName = cleanText(
    getMetaContent(html, "property", "og:site_name")
  )
  const pageTitle = cleanText(extractTitle(html))

  const primaryImage =
    resolveAssetUrl(getMetaContent(html, "property", "og:image:secure_url"), baseUrl) ??
    resolveAssetUrl(getMetaContent(html, "property", "og:image"), baseUrl) ??
    resolveAssetUrl(getMetaContent(html, "name", "twitter:image"), baseUrl) ??
    resolveAssetUrl(getMetaContent(html, "name", "twitter:image:src"), baseUrl)

  const favicon = extractFavicon(html, baseUrl)

  const derivedUrl = resolveAssetUrl(ogUrl, baseUrl) ?? baseUrl.toString()
  const derivedTitle = ogTitle ?? twitterTitle ?? pageTitle
  const derivedDescription =
    ogDescription ?? twitterDescription ?? metaDescription
  const siteName = ogSiteName ?? baseUrl.hostname

  return {
    url: derivedUrl,
    title: derivedTitle,
    description: derivedDescription,
    image: primaryImage,
    favicon,
    siteName,
  }
}

const createFallbackPreview = (url: URL): LinkPreviewData => ({
  url: url.toString(),
  title: null,
  description: null,
  image: null,
  favicon: null,
  siteName: url.hostname,
})

export async function POST(request: Request) {
  let candidateUrl: string | undefined
  try {
    const payload = (await request.json()) as { url?: string }
    candidateUrl = typeof payload.url === "string" ? payload.url.trim() : undefined
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }

  if (!candidateUrl) {
    return NextResponse.json(
      { error: "A URL is required" },
      { status: 400 }
    )
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(candidateUrl)
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid URL" },
      { status: 400 }
    )
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return NextResponse.json(
      { error: "Only HTTP and HTTPS URLs are supported" },
      { status: 400 }
    )
  }

  const cacheKey = parsedUrl.toString()
  const cache = getPreviewCache()
  const cachedEntry = cache.get(cacheKey)
  const now = Date.now()

  if (cachedEntry && cachedEntry.expiresAt > now) {
    return NextResponse.json({ preview: cachedEntry.data, cached: true })
  }

  if (cachedEntry && cachedEntry.expiresAt <= now) {
    cache.delete(cacheKey)
  }

  let html: string | null = null
  try {
    const response = await fetch(parsedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    })

    if (!response.ok) {
      throw new Error(`Failed to load URL: ${response.status}`)
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("text/html")) {
      const fallback = createFallbackPreview(parsedUrl)
      cache.set(cacheKey, { data: fallback, expiresAt: now + PREVIEW_CACHE_TTL_MS })
      return NextResponse.json({ preview: fallback, cached: false })
    }

    html = await response.text()
  } catch (error) {
    const fallback = createFallbackPreview(parsedUrl)
    cache.set(cacheKey, { data: fallback, expiresAt: now + PREVIEW_CACHE_TTL_MS })
    return NextResponse.json({ preview: fallback, cached: false })
  }

  const preview = buildPreviewFromHtml(html, parsedUrl)
  cache.set(cacheKey, { data: preview, expiresAt: now + PREVIEW_CACHE_TTL_MS })

  return NextResponse.json({ preview, cached: false })
}
