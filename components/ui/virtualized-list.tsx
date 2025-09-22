"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

import { cn } from "@/lib/utils"

type EstimateSize<T> = number | ((item: T, index: number) => number)

interface VirtualizedListProps<T> {
  items: readonly T[]
  renderItem: (item: T, index: number) => ReactNode
  getItemKey?: (item: T, index: number) => string | number
  estimateSize?: EstimateSize<T>
  overscan?: number
  className?: string
  innerClassName?: string
  staticInnerClassName?: string
  itemClassName?: string
  stickyHeader?: ReactNode
  minItemCountForVirtualization?: number
  measureElements?: boolean
}

const DEFAULT_ESTIMATE = 72
const DEFAULT_STATIC_CLASS = "flex flex-col gap-4"

export function VirtualizedList<T>({
  items,
  renderItem,
  getItemKey,
  estimateSize = DEFAULT_ESTIMATE,
  overscan = 6,
  className,
  innerClassName,
  staticInnerClassName = DEFAULT_STATIC_CLASS,
  itemClassName,
  stickyHeader,
  minItemCountForVirtualization = 12,
  measureElements = true,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const shouldVirtualize = isMounted && items.length >= minItemCountForVirtualization

  const estimate = useCallback(
    (index: number) => {
      if (typeof estimateSize === "number") {
        return estimateSize
      }

      const item = items[index]
      return estimateSize(item, index)
    },
    [estimateSize, items],
  )

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: estimate,
    overscan,
    enabled: shouldVirtualize,
  })

  const virtualItems = shouldVirtualize ? virtualizer.getVirtualItems() : []
  const totalSize = shouldVirtualize ? virtualizer.getTotalSize() : 0
  const measure =
    measureElements && shouldVirtualize
      ? (node: Element | null) => {
          virtualizer.measureElement(node)
        }
      : undefined

  return (
    <div ref={parentRef} className={cn("relative w-full overflow-y-auto", className)}>
      {stickyHeader ? (
        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {stickyHeader}
        </div>
      ) : null}
      {shouldVirtualize ? (
        <div className={cn("relative w-full", innerClassName)} style={{ height: totalSize }}>
          {virtualItems.map((virtualItem) => {
            const item = items[virtualItem.index]
            const key =
              getItemKey?.(item, virtualItem.index) ?? `${virtualItem.index}-${virtualItem.key}`

            return (
              <div
                key={key}
                ref={measure}
                className={cn("absolute inset-x-0", itemClassName)}
                style={{ transform: `translateY(${virtualItem.start}px)` }}
              >
                {renderItem(item, virtualItem.index)}
              </div>
            )
          })}
        </div>
      ) : (
        <div className={cn(staticInnerClassName)}>
          {items.map((item, index) => {
            const key = getItemKey?.(item, index) ?? index
            return (
              <div key={key} className={itemClassName}>
                {renderItem(item, index)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
