'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type UseVirtualizedListOptions = {
  itemCount: number
  estimateHeight: number
  overscan?: number
  enabled?: boolean
}

type VirtualizedListResult = {
  containerRef: React.RefObject<HTMLDivElement>
  startIndex: number
  endIndex: number
  offset: number
  totalHeight: number
  enabled: boolean
}

export function useVirtualizedList({
  itemCount,
  estimateHeight,
  overscan = 6,
  enabled = true,
}: UseVirtualizedListOptions): VirtualizedListResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    if (!enabled) return

    const container = containerRef.current
    if (!container) return

    const updateViewport = () => {
      setViewportHeight(container.clientHeight)
    }

    const handleScroll = () => {
      setScrollTop(container.scrollTop)
    }

    updateViewport()
    container.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', updateViewport)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', updateViewport)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    setViewportHeight(container.clientHeight)
  }, [enabled, itemCount])

  const effectiveViewport = viewportHeight || estimateHeight * 6

  const startIndex = enabled
    ? Math.max(0, Math.floor(scrollTop / estimateHeight) - overscan)
    : 0
  const endIndex = enabled
    ? Math.min(
        itemCount,
        Math.ceil((scrollTop + effectiveViewport) / estimateHeight) + overscan,
      )
    : itemCount

  const safeEndIndex = Math.max(startIndex, endIndex)

  const offset = enabled ? startIndex * estimateHeight : 0
  const totalHeight = useMemo(
    () => itemCount * estimateHeight,
    [itemCount, estimateHeight],
  )

  return {
    containerRef,
    startIndex,
    endIndex: safeEndIndex,
    offset,
    totalHeight,
    enabled: enabled && itemCount > 0,
  }
}
