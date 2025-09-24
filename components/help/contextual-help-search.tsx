"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { track } from "@vercel/analytics/react"
import { ExternalLink, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ApiSearchResult = {
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

type ApiSearchResponse = {
  query: string
  context: string | null
  results: ApiSearchResult[]
  suggestions: string[]
  fetchedAt?: string
}

const DEFAULT_DEBOUNCE_MS = 250

function buildSearchUrl(context: string, limit: number, query: string) {
  const params = new URLSearchParams()
  if (query.trim().length > 0) {
    params.set("q", query)
  }
  params.set("context", context)
  params.set("limit", String(limit))
  return `/api/help/search?${params.toString()}`
}

interface ContextualHelpSearchProps {
  context: string
  title: string
  description: string
  className?: string
  maxResults?: number
}

export function ContextualHelpSearch({
  context,
  title,
  description,
  className,
  maxResults = 6,
}: ContextualHelpSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ApiSearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const normalizedContext = useMemo(() => context.toLowerCase(), [context])

  const fetchResults = useCallback(
    async (nextQuery: string, { trackClientEvent = false } = {}) => {
      const controller = new AbortController()
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = controller

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch(buildSearchUrl(normalizedContext, maxResults, nextQuery), {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Search failed with status ${response.status}`)
        }

        const payload: ApiSearchResponse = await response.json()
        setResults(payload.results)
        setSuggestions(payload.suggestions)

        if (trackClientEvent && nextQuery.trim().length > 0) {
          track("help_center_search_client", {
            context: normalizedContext,
            queryLength: nextQuery.length,
            resultCount: payload.results.length,
          })
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return
        }
        console.error("Failed to load help search results", error)
        setErrorMessage("We couldn't load help articles right now. Please try again.")
      } finally {
        setIsLoading(false)
      }
    },
    [maxResults, normalizedContext],
  )

  useEffect(() => {
    fetchResults("")

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [fetchResults])

  useEffect(() => {
    if (query.trim().length === 0) {
      return
    }

    const handle = window.setTimeout(() => {
      fetchResults(query, { trackClientEvent: true })
    }, DEFAULT_DEBOUNCE_MS)

    return () => window.clearTimeout(handle)
  }, [fetchResults, query])

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (value.trim().length === 0) {
        fetchResults("")
      }
    },
    [fetchResults],
  )

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setQuery(suggestion)
      fetchResults(suggestion, { trackClientEvent: true })
      track("help_center_suggestion_clicked", {
        context: normalizedContext,
        suggestion,
      })
    },
    [fetchResults, normalizedContext],
  )

  const handleArticleClick = useCallback(
    (result: ApiSearchResult) => {
      track("help_center_article_opened", {
        context: normalizedContext,
        articleId: result.id,
        queryLength: query.length,
      })
    },
    [normalizedContext, query.length],
  )

  const hasResults = results.length > 0

  return (
    <Card className={cn("h-full border-border/70", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Search for help articles"
              className="pl-9"
              aria-label={`${title} search`}
            />
          </div>
          {errorMessage ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Searching the Roomsily help center…</p>
          )}

          {!isLoading && !hasResults && !errorMessage ? (
            <p className="text-sm text-muted-foreground">
              No help articles match that search yet. Try a different keyword or pick a suggested topic below.
            </p>
          ) : null}

          {hasResults ? (
            <ul className="space-y-3">
              {results.map((result) => (
                <li key={result.id} className="rounded-lg border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{result.title}</p>
                      <p className="text-sm text-muted-foreground">{result.highlight}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="rounded-full text-xs capitalize">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="shrink-0 text-xs"
                      onClick={() => handleArticleClick(result)}
                    >
                      <a href={result.url} target="_blank" rel="noreferrer">
                        View
                        <ExternalLink className="ml-1 size-3" aria-hidden="true" />
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {suggestions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Suggested topics
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
