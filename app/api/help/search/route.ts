import { track } from "@vercel/analytics/server"

import { getHelpArticles } from "@/lib/help/articles"
import { registerSearchImpressions, searchHelpArticles } from "@/lib/help/search"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const queryParam = url.searchParams.get("q")?.trim() ?? ""
  const contextParam = url.searchParams.get("context")?.trim().toLowerCase() ?? ""
  const limitParam = url.searchParams.get("limit")
  const refreshParam = url.searchParams.get("refresh")

  const context = contextParam.length > 0 ? contextParam : null
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(15, Math.max(1, parsedLimit))
    : 8
  const forceRefresh = refreshParam === "true" || refreshParam === "1"

  try {
    const articles = await getHelpArticles({ forceRefresh })
    const searchPayload = searchHelpArticles(articles, {
      query: queryParam,
      context,
      limit,
    })

    registerSearchImpressions(
      context,
      searchPayload.results.slice(0, 5).map((result) => result.id),
    )

    track("help_center_search", {
      query: queryParam.length > 0 ? queryParam.slice(0, 80) : "(empty)",
      context: context ?? "global",
      resultCount: searchPayload.results.length,
      suggestionCount: searchPayload.suggestions.length,
    }).catch(() => {})

    return Response.json({
      ...searchPayload,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Help search failed", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
