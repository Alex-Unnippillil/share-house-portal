import { fallbackCmsHelpArticles, type CmsHelpArticle } from "@/lib/data/help-articles"

export type HelpArticle = {
  id: string
  slug: string
  title: string
  summary: string
  body: string
  url: string
  tags: string[]
  contexts: string[]
  keywords: string[]
  popularity: number
  updatedAt: string
}

const HELP_CMS_ENDPOINT =
  process.env.HELP_CENTER_CMS_ENDPOINT ??
  process.env.HELP_CENTER_API_URL ??
  process.env.CMS_HELP_ENDPOINT ??
  null

const CACHE_TTL_MS = 1000 * 60 * 10 // 10 minutes
let cachedArticles: HelpArticle[] | null = null
let cachedAt = 0

function normalizeCmsRecord(record: CmsHelpArticle): HelpArticle {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    summary: record.summary,
    body: record.body,
    url: record.url,
    tags: record.tags,
    contexts: record.contexts.map((context) => context.toLowerCase()),
    keywords: Array.from(
      new Set(
        [
          ...(record.searchKeywords ?? []),
          record.title,
          record.summary,
          record.body,
          record.slug.replace(/[-_/]/g, " "),
        ]
          .join(" ")
          .toLowerCase()
          .split(/[\s,]+/)
          .filter(Boolean),
      ),
    ),
    popularity: record.popularity ?? 0.5,
    updatedAt: record.updatedAt,
  }
}

async function fetchArticlesFromCms(): Promise<CmsHelpArticle[] | null> {
  if (!HELP_CMS_ENDPOINT) {
    return null
  }

  try {
    const response = await fetch(HELP_CMS_ENDPOINT, {
      headers: { Accept: "application/json" },
      next: { revalidate: 120 },
    })

    if (!response.ok) {
      throw new Error(`CMS request failed with status ${response.status}`)
    }

    const payload = await response.json()
    if (Array.isArray(payload)) {
      return payload as CmsHelpArticle[]
    }

    if (Array.isArray(payload?.data)) {
      return payload.data as CmsHelpArticle[]
    }

    if (Array.isArray(payload?.items)) {
      return payload.items as CmsHelpArticle[]
    }

    return null
  } catch (error) {
    console.error("Failed to load help articles from CMS", error)
    return null
  }
}

export async function getHelpArticles(options?: { forceRefresh?: boolean }) {
  const forceRefresh = options?.forceRefresh ?? false
  const now = Date.now()

  if (!forceRefresh && cachedArticles && now - cachedAt < CACHE_TTL_MS) {
    return cachedArticles
  }

  const cmsRecords = await fetchArticlesFromCms()
  const recordsToUse = cmsRecords && cmsRecords.length > 0 ? cmsRecords : fallbackCmsHelpArticles

  cachedArticles = recordsToUse.map(normalizeCmsRecord).sort((a, b) => b.popularity - a.popularity)
  cachedAt = now

  return cachedArticles
}
