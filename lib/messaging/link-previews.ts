export type LinkPreviewStatus = "ready" | "error"

export type LinkPreview = {
  url: string
  canonicalUrl: string
  title?: string
  description?: string
  image?: string
  favicon?: string
  siteName?: string
  status: LinkPreviewStatus
  fetchedAt: string
  error?: string
}

const previewStore = new Map<string, LinkPreview>()

function normaliseUrl(url: string): string | null {
  try {
    return new URL(url).toString()
  } catch (error) {
    return null
  }
}

export function rememberLinkPreview(preview: LinkPreview) {
  const canonicalUrl = normaliseUrl(preview.canonicalUrl) ?? preview.canonicalUrl
  const originalUrl = normaliseUrl(preview.url) ?? preview.url

  const record: LinkPreview = {
    ...preview,
    canonicalUrl,
    url: originalUrl,
  }

  previewStore.set(canonicalUrl, record)

  if (originalUrl !== canonicalUrl) {
    previewStore.set(originalUrl, record)
  }
}

export function getLinkPreview(url: string): LinkPreview | undefined {
  const key = normaliseUrl(url)

  if (!key) {
    return undefined
  }

  return previewStore.get(key)
}

export function upsertLinkPreview(
  url: string,
  data: Partial<Omit<LinkPreview, "url" | "canonicalUrl" | "fetchedAt">> & {
    status?: LinkPreviewStatus
    canonicalUrl?: string
  }
) {
  const existing = getLinkPreview(url)

  const fetchedAt = new Date().toISOString()
  const canonicalUrl =
    (data.canonicalUrl && normaliseUrl(data.canonicalUrl)) || existing?.canonicalUrl || normaliseUrl(url) || url
  const record: LinkPreview = {
    url,
    canonicalUrl,
    fetchedAt,
    title: data.title ?? existing?.title,
    description: data.description ?? existing?.description,
    image: data.image ?? existing?.image,
    favicon: data.favicon ?? existing?.favicon,
    siteName: data.siteName ?? existing?.siteName,
    status: data.status ?? existing?.status ?? "ready",
    error: data.error,
  }

  rememberLinkPreview(record)

  return record
}

export function createFallbackPreview(url: string, reason?: string): LinkPreview {
  const canonicalUrl = normaliseUrl(url) ?? url
  const host = safeHostname(canonicalUrl)

  return {
    url,
    canonicalUrl,
    title: host,
    siteName: host,
    status: "error",
    description: undefined,
    favicon: undefined,
    image: undefined,
    fetchedAt: new Date().toISOString(),
    error: reason,
  }
}

export function buildFallbackPreview(url: string, reason?: string) {
  const fallback = createFallbackPreview(url, reason)
  rememberLinkPreview(fallback)
  return fallback
}

export function clearLinkPreviewStore() {
  previewStore.clear()
}

export function extractUrlsFromText(text: string) {
  const urlPattern = /(https?:\/\/[^\s<]+[^\s.,!?<)\]])/gi
  const matches = text.match(urlPattern) ?? []

  const cleaned = matches.map((match) => match.replace(/[\s"'<>]+$/g, "").replace(/[).,!?:;]+$/g, ""))

  return Array.from(new Set(cleaned))
}

export function safeHostname(url: string) {
  try {
    return new URL(url).hostname
  } catch (error) {
    return url
  }
}

export function resolveUrl(candidate: string | undefined, base: string) {
  if (!candidate) return undefined

  try {
    return new URL(candidate, base).toString()
  } catch (error) {
    return undefined
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function extractMetaContent(html: string, keys: string[]) {
  for (const key of keys) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`<meta[^>]+(?:property|name)=(?:"${escapedKey}"|'${escapedKey}')[^>]*>`, "gi")

    const match = regex.exec(html)
    if (match) {
      const tag = match[0]
      const contentMatch = tag.match(/content=("([^"]*)"|'([^']*)')/i)
      if (contentMatch) {
        return decodeHtmlEntities(contentMatch[2] ?? contentMatch[3] ?? "").trim()
      }
    }
  }

  return undefined
}

function extractLinkHref(html: string, rels: string[], base: string) {
  const relPattern = rels.map((rel) => rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
  const regex = new RegExp(`<link[^>]+rel=(?:"(${relPattern})"|'(${relPattern})')[^>]*>`, "gi")
  const match = regex.exec(html)
  if (!match) return undefined

  const tag = match[0]
  const hrefMatch = tag.match(/href=("([^"]*)"|'([^']*)')/i)
  const href = hrefMatch ? hrefMatch[2] ?? hrefMatch[3] : undefined
  return resolveUrl(href, base)
}

export function parseOpenGraph(html: string, url: string) {
  const base = normaliseUrl(url) ?? url

  const metadata = {
    url: extractMetaContent(html, ["og:url"]) ?? extractLinkHref(html, ["canonical"], base) ?? base,
    title: extractMetaContent(html, ["og:title", "twitter:title", "title"]),
    description: extractMetaContent(html, ["og:description", "twitter:description", "description"]),
    image: resolveUrl(extractMetaContent(html, ["og:image", "twitter:image", "twitter:image:src"]), base),
    siteName: extractMetaContent(html, ["og:site_name"]),
    favicon: extractLinkHref(html, ["icon", "shortcut icon", "apple-touch-icon"], base),
  }

  if (!metadata.title) {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    if (titleMatch) {
      metadata.title = decodeHtmlEntities(titleMatch[1].trim())
    }
  }

  return metadata
}

export function buildPreviewFromMetadata(url: string, html: string) {
  const baseUrl = normaliseUrl(url) ?? url
  const og = parseOpenGraph(html, baseUrl)
  const canonicalUrl = normaliseUrl(og.url) ?? baseUrl
  const host = safeHostname(canonicalUrl)

  return {
    url,
    canonicalUrl,
    title: og.title ?? host,
    description: og.description,
    image: og.image,
    favicon: og.favicon,
    siteName: og.siteName ?? host,
    status: "ready" as const,
    fetchedAt: new Date().toISOString(),
  }
}

export function seedPreview(preview: LinkPreview) {
  rememberLinkPreview(preview)
}

export function previewStoreSnapshot() {
  return Array.from(new Set(previewStore.values()))
}

