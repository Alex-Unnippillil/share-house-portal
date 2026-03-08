"use client"

import { PropsWithChildren, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

import { usePullToRefresh } from "@/hooks/use-pull-to-refresh"

type MembersScrollContainerProps = PropsWithChildren<{
  className?: string
}>

export function MembersScrollContainer({ children, className }: MembersScrollContainerProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  usePullToRefresh({ containerRef, onRefresh: handleRefresh })

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}
