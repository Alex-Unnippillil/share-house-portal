"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { track } from "@vercel/analytics/react"
import { Search } from "lucide-react"

import { siteConfig } from "@/config/site"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  filterRecoveryResources,
  type RecoveryResource,
} from "@/lib/recovery-resources"
import { cn } from "@/lib/utils"

type RecoveryPageProps = {
  title: string
  subtitle: string
  context: "global_error" | "not_found"
  error?: Error
  onRetry?: () => void
}

const MAX_VISIBLE_RESULTS = 6

export function RecoveryPage({
  title,
  subtitle,
  context,
  error,
  onRetry,
}: RecoveryPageProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const results = useMemo<RecoveryResource[]>(() => {
    return filterRecoveryResources(query).slice(0, MAX_VISIBLE_RESULTS)
  }, [query])

  const hasQuery = query.trim().length > 0
  const hasResults = results.length > 0

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextQuery = query.trim()
    if (nextQuery.length === 0) {
      track("recovery_search_skipped", { context })
      return
    }

    track("recovery_search_submitted", {
      context,
      query: nextQuery,
      hasResults,
      destination: hasResults ? results[0]?.href : null,
    })

    if (hasResults) {
      router.push(results[0]!.href)
    }
  }

  const handleRetry = () => {
    track("recovery_retry_clicked", { context })
    onRetry?.()
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,theme(colors.primary.DEFAULT)/18%,transparent_60%)] bg-slate-950 px-6 py-16 text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_right,theme(colors.secondary.DEFAULT)/12%,transparent_55%)]" aria-hidden="true" />
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10 text-center">
        <div className="space-y-3">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary-foreground/80">
            Roomsily portal guide
          </span>
          <h1 className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-3xl font-semibold text-transparent sm:text-4xl">
            {title}
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">{subtitle}</p>
          {error?.message ? (
            <p className="text-xs text-muted-foreground/80">
              Reference: <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-[11px]">{error.message}</code>
            </p>
          ) : null}
        </div>

        <form
          onSubmit={handleSearch}
          className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-background/80 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for payments, bookings, visitors…"
              className="h-12 rounded-xl border-transparent bg-background/60 pl-10 text-base"
              aria-label="Search the Roomsily portal"
            />
          </div>
          <Button type="submit" className="h-12 rounded-xl px-6 text-base" disabled={!hasQuery}>
            Run search
          </Button>
        </form>

        <div className="w-full space-y-4 rounded-2xl border border-white/10 bg-background/70 p-6 text-left shadow-2xl backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground/80">
            Quick links
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {hasResults ? (
              results.map((resource) => (
                <Link
                  key={resource.href}
                  href={resource.href}
                  className="group flex flex-col gap-1 rounded-xl border border-transparent bg-muted/10 p-4 transition hover:border-primary/30 hover:bg-primary/10"
                >
                  <span className="font-medium text-foreground transition group-hover:text-primary">
                    {resource.title}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {resource.description}
                  </span>
                </Link>
              ))
            ) : (
              <p className="col-span-full rounded-xl border border-dashed border-muted-foreground/20 bg-muted/10 p-4 text-sm text-muted-foreground">
                No matches found. Try different keywords or head back to the dashboard for a full overview.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "rounded-xl px-6 text-base"
            )}
          >
            Back to dashboard
          </Link>
          <Link
            href={siteConfig.links.contact}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-xl px-6 text-base"
            )}
          >
            Contact support
          </Link>
          {onRetry ? (
            <Button type="button" className="rounded-xl px-6 text-base" onClick={handleRetry}>
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
