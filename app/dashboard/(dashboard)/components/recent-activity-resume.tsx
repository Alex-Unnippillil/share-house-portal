"use client"

import { useEffect, useMemo, useState } from "react"
import { formatDistanceToNow, parseISO } from "date-fns"

import SmartLink from "@/components/navigation/SmartLink"
import { Button } from "@/components/ui/button"
import {
  getResumeEntry,
  loadRecentActivity,
  type RecentActivityEntry,
} from "@/lib/recent-activity"

const DISPLAY_LIMIT = 5

type RecentActivityResumeProps = {
  initialEntries: RecentActivityEntry[]
}

function dedupeEntries(entries: RecentActivityEntry[]): RecentActivityEntry[] {
  const byKey = new Map<string, RecentActivityEntry>()

  for (const entry of entries) {
    const key = entry.entityId ? `${entry.route}#${entry.entityId}` : entry.route
    const current = byKey.get(key)
    if (!current) {
      byKey.set(key, entry)
      continue
    }

    if (
      new Date(entry.accessedAt).getTime() >
      new Date(current.accessedAt).getTime()
    ) {
      byKey.set(key, entry)
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime(),
  )
}

function safeFormatDistance(value: string) {
  const parsed = parseISO(value)
  if (Number.isNaN(parsed.getTime())) {
    return "just now"
  }

  try {
    return formatDistanceToNow(parsed, { addSuffix: true })
  } catch (error) {
    return "just now"
  }
}

export function RecentActivityResume({
  initialEntries,
}: RecentActivityResumeProps) {
  const [entries, setEntries] = useState(() => dedupeEntries(initialEntries))

  useEffect(() => {
    let active = true

    if (typeof window === "undefined") {
      return () => {
        active = false
      }
    }

    const storage = window.localStorage

    loadRecentActivity({ storage }).then((clientEntries) => {
      if (!active) {
        return
      }

      if (initialEntries.length === 0) {
        setEntries(dedupeEntries(clientEntries))
        return
      }

      if (clientEntries.length === 0) {
        setEntries(dedupeEntries(initialEntries))
        return
      }

      setEntries(dedupeEntries([...initialEntries, ...clientEntries]))
    })

    return () => {
      active = false
    }
  }, [initialEntries])

  const visibleEntries = useMemo(
    () => entries.slice(0, DISPLAY_LIMIT),
    [entries],
  )
  const resumeEntry = useMemo(() => getResumeEntry(entries), [entries])

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Recent activity</p>
          <p className="text-xs text-muted-foreground">
            We keep track of the pages and records you last opened so you can
            jump back in.
          </p>
        </div>
        {resumeEntry ? (
          <SmartLink href={resumeEntry.route} intent="navigation">
            <Button size="sm" variant="secondary">
              Resume
            </Button>
          </SmartLink>
        ) : null}
      </div>

      {visibleEntries.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {visibleEntries.map((entry) => (
            <li
              key={`${entry.route}-${entry.accessedAt}`}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {entry.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {safeFormatDistance(entry.accessedAt)}
                </p>
              </div>
              <SmartLink
                href={entry.route}
                intent="navigation"
                className="text-sm font-medium text-primary hover:underline"
              >
                Open
              </SmartLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          We’ll show your recently opened items here once you start exploring
          the portal.
        </p>
      )}
    </div>
  )
}

export default RecentActivityResume
