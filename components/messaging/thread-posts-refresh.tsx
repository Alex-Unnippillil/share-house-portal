"use client"

import type { ReactNode } from "react"
import { useCallback } from "react"
import { useRouter } from "next/navigation"

import { PullToRefresh } from "@/components/pull-to-refresh"

interface ThreadPostsRefreshProps {
  children: ReactNode
}

export function ThreadPostsRefresh({ children }: ThreadPostsRefreshProps) {
  const router = useRouter()

  const handleRefresh = useCallback(async () => {
    router.refresh()
    await new Promise((resolve) => setTimeout(resolve, 150))
  }, [router])

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-8">{children}</div>
    </PullToRefresh>
  )
}
