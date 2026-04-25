"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import SmartLink from "@/components/navigation/SmartLink"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import type { RoommateUpdate } from "../data"

const topicCopy: Record<
  "maintenance" | "announcement" | "logistics",
  { label: string; variant: "outline" | "secondary" | "default" }
> = {
  maintenance: {
    label: "Maintenance",
    variant: "outline",
  },
  announcement: {
    label: "Announcement",
    variant: "secondary",
  },
  logistics: {
    label: "Logistics",
    variant: "default",
  },
}

type Props = {
  initialUpdates: RoommateUpdate[]
}

function formatRelativeTime(timestamp: string, referenceTime: number) {
  const date = new Date(timestamp)
  const diff = referenceTime - date.getTime()

  const minutes = Math.round(diff / (1000 * 60))
  if (minutes < 1) {
    return "Just now"
  }
  if (minutes < 60) {
    return `${minutes} min ago`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours} hr${hours > 1 ? "s" : ""} ago`
  }
  const days = Math.round(hours / 24)
  return `${days} day${days > 1 ? "s" : ""} ago`
}

export function RoommateBoardRealtime({ initialUpdates }: Props) {
  const router = useRouter()
  const [referenceTime, setReferenceTime] = useState(() => Date.now())

  useEffect(() => {
    const relativeTimeInterval = window.setInterval(() => {
      setReferenceTime(Date.now())
    }, 60_000)

    const refreshInterval = window.setInterval(() => {
      router.refresh()
    }, 30_000)

    return () => {
      window.clearInterval(relativeTimeInterval)
      window.clearInterval(refreshInterval)
    }
  }, [router])

  return (
    <>
      <ul className="space-y-3">
        {initialUpdates.map((update) => {
          const { label, variant } = topicCopy[update.topic]
          return (
            <li
              key={update.id}
              className="rounded-lg border border-transparent bg-muted/40 p-3 transition-colors hover:border-border/70 hover:bg-muted/60"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span>{update.author}</span>
                  <Badge variant={variant}>{label}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(update.timestamp, referenceTime)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {update.message}
              </p>
            </li>
          )
        })}
      </ul>

      <SmartLink href="/messaging" className="inline-flex" intent="navigation">
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          Open message board
        </Button>
      </SmartLink>
    </>
  )
}
