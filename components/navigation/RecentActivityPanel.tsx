"use client"

import * as React from "react"
import { ArrowUpRight, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SmartLink from "@/components/navigation/SmartLink"
import type { Tables } from "@/lib/supabase"

type RecentActivityItem = Tables<"user_recent_items">

type RecentActivityPanelProps = {
  items: RecentActivityItem[]
  lastRoute: string | null
}

function formatEntityType(entityType: string) {
  return entityType
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function formatVisitedAt(timestamp: string | null | undefined) {
  if (!timestamp) {
    return "Just now"
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return "Just now"
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function RecentActivityPanel({ items, lastRoute }: RecentActivityPanelProps) {
  const resumeTarget = React.useMemo(() => items[0], [items])

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="space-y-1">
          <CardTitle>Recent activity</CardTitle>
          <p className="text-sm text-muted-foreground">
            Jump back into the documents, payments, and tasks you opened most recently.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            We’ll keep track of the pages you visit most so you can resume work without hunting for links.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const visitedAt = item.visited_at ?? item.updated_at ?? item.created_at
              const href = item.last_visited_route || "#"

              return (
                <li key={`${item.entity_type}:${item.entity_id}`}>
                  <SmartLink
                    href={href}
                    intent="navigation"
                    recentActivity={{
                      entityType: item.entity_type,
                      entityId: item.entity_id,
                      label: item.label,
                      route: href,
                    }}
                    className="group flex items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 transition-colors hover:border-border"
                  >
                    <div className="space-y-1 text-left">
                      <p className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatEntityType(item.entity_type)} · {formatVisitedAt(visitedAt)}
                      </p>
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </SmartLink>
                </li>
              )
            })}
          </ul>
        )}

        {lastRoute && resumeTarget ? (
          <SmartLink
            href={lastRoute}
            intent="navigation"
            recentActivity={{
              entityType: resumeTarget.entity_type,
              entityId: resumeTarget.entity_id,
              label: resumeTarget.label,
              route: lastRoute,
            }}
            className="inline-flex w-full"
          >
            <Button variant="outline" className="w-full items-center justify-center gap-2 text-sm">
              Resume {resumeTarget.label}
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </SmartLink>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default RecentActivityPanel
