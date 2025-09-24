import type { HelpArticle } from "@/lib/help/articles"

export type HelpSearchResult = {
  id: string
  slug: string
  title: string
  summary: string
  url: string
  tags: string[]
  contexts: string[]
  score: number
  matchedFields: string[]
  highlight: string
}

export type HelpSearchResponse = {
  query: string
  context: string | null
  results: HelpSearchResult[]
  suggestions: string[]
}

type SearchOptions = {
  query: string
  context?: string | null
  limit?: number
}

const usageByContext = new Map<string, Map<string, number>>()
const GLOBAL_CONTEXT = "__global__"

function getUsageMap(context: string | null | undefined) {
  const key = context && context.trim().length > 0 ? context.toLowerCase() : GLOBAL_CONTEXT
  let map = usageByContext.get(key)
  if (!map) {
    map = new Map<string, number>()
    usageByContext.set(key, map)
  }
  return map
}

function getUsageBoost(articleId: string, context: string | null | undefined) {
  const contextMap = getUsageMap(context)
  const globalMap = getUsageMap(GLOBAL_CONTEXT)
  const contextValue = contextMap.get(articleId) ?? 0
  const globalValue = globalMap.get(articleId) ?? 0
  const combined = contextValue * 1.2 + globalValue * 0.6
  return combined > 0 ? Math.log1p(combined) * 1.8 : 0
}

export function registerSearchImpressions(
  context: string | null,
  articleIds: string[],
) {
  if (articleIds.length === 0) {
    return
  }

  const contextMap = getUsageMap(context)
  const globalMap = getUsageMap(GLOBAL_CONTEXT)

  articleIds.forEach((articleId, index) => {
    const weight = Math.max(0.25, 1.5 - index * 0.35)
    contextMap.set(articleId, (contextMap.get(articleId) ?? 0) + weight)
    globalMap.set(articleId, (globalMap.get(articleId) ?? 0) + weight * 0.5)
  })
}

function tokenize(query: string) {
  return query
    .toLowerCase()
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function computeHighlight(article: HelpArticle, tokens: string[]) {
  if (tokens.length === 0) {
    return article.summary
  }

  const body = article.body
  const lowerBody = body.toLowerCase()
  const lowerSummary = article.summary.toLowerCase()

  for (const token of tokens) {
    const summaryIndex = lowerSummary.indexOf(token)
    if (summaryIndex !== -1) {
      return article.summary
    }

    const bodyIndex = lowerBody.indexOf(token)
    if (bodyIndex !== -1) {
      const start = Math.max(0, bodyIndex - 60)
      const end = Math.min(body.length, bodyIndex + token.length + 60)
      const snippet = body
        .slice(start, end)
        .replace(/\s+/g, " ")
        .trim()
      return `${start > 0 ? "…" : ""}${snippet}${end < body.length ? "…" : ""}`
    }
  }

  return article.summary
}

function computeArticleScore(
  article: HelpArticle,
  tokens: string[],
  context: string | null,
) {
  const matchedFields = new Set<string>()
  const title = article.title.toLowerCase()
  const summary = article.summary.toLowerCase()
  const body = article.body.toLowerCase()
  const slug = article.slug.toLowerCase()

  let score = 0
  if (context) {
    const normalizedContext = context.toLowerCase()
    if (article.contexts.includes(normalizedContext)) {
      score += 8
      matchedFields.add("context")
    } else if (article.contexts.some((ctx) => normalizedContext.includes(ctx))) {
      score += 3
      matchedFields.add("context")
    }
  }

  for (const token of tokens) {
    if (title.includes(token)) {
      score += 6
      matchedFields.add("title")
    }
    if (summary.includes(token)) {
      score += 4
      matchedFields.add("summary")
    }
    if (body.includes(token)) {
      score += 2.5
      matchedFields.add("body")
    }
    if (slug.includes(token)) {
      score += 2
      matchedFields.add("slug")
    }
    if (article.keywords.includes(token)) {
      score += 1.5
      matchedFields.add("keywords")
    }
  }

  score += article.popularity * 2
  score += getUsageBoost(article.id, context)

  return { score, matchedFields: Array.from(matchedFields) }
}

function getSuggestedArticles(
  articles: HelpArticle[],
  context: string | null,
  limit: number,
) {
  const normalizedContext = context?.toLowerCase() ?? null
  const ranked = articles
    .map((article) => {
      const { score } = computeArticleScore(article, [], normalizedContext)
      const usageBoost = getUsageBoost(article.id, normalizedContext)
      return { article, score: score + usageBoost }
    })
    .sort((a, b) => b.score - a.score)

  return normalizedContext
    ? ranked
        .filter((item) => item.article.contexts.includes(normalizedContext))
        .slice(0, limit)
    : ranked.slice(0, limit)
}

export function searchHelpArticles(
  articles: HelpArticle[],
  options: SearchOptions,
): HelpSearchResponse {
  const { query, context = null, limit = 8 } = options
  const tokens = tokenize(query)

  if (tokens.length === 0) {
    const suggestions = getSuggestedArticles(articles, context, limit)
    const results = suggestions.map(({ article, score }) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      url: article.url,
      tags: article.tags,
      contexts: article.contexts,
      score,
      matchedFields: context ? ["context"] : [],
      highlight: article.summary,
    }))

    return {
      query,
      context,
      results,
      suggestions: suggestions.map(({ article }) => article.title),
    }
  }

  const rankedResults = articles
    .map((article) => {
      const { score, matchedFields } = computeArticleScore(article, tokens, context)
      return {
        article,
        score,
        matchedFields,
      }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  const results = rankedResults.map((item) => ({
    id: item.article.id,
    slug: item.article.slug,
    title: item.article.title,
    summary: item.article.summary,
    url: item.article.url,
    tags: item.article.tags,
    contexts: item.article.contexts,
    score: Number(item.score.toFixed(2)),
    matchedFields: item.matchedFields,
    highlight: computeHighlight(item.article, tokens),
  }))

  const suggestions = rankedResults.slice(0, Math.min(5, rankedResults.length)).map((item) => item.article.title)

  return {
    query,
    context,
    results,
    suggestions,
  }
}
