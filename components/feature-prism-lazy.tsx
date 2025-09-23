"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const FeaturePrism = dynamic(() => import("./feature-prism"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[480px] items-center justify-center rounded-3xl border border-dashed border-border/40 bg-muted/10 text-sm text-muted-foreground">
      Loading interactive feature prism…
    </div>
  ),
})

interface FeaturePrismLazyProps {
  className?: string
  /**
   * IntersectionObserver root margin.
   * Allows the 3D bundle to start loading slightly before entering the viewport.
   */
  observeMargin?: string
}

export function FeaturePrismLazy({ className, observeMargin = "200px" }: FeaturePrismLazyProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const node = containerRef.current
    if (!node || shouldRender) {
      return
    }

    if (typeof window !== "undefined" && !("IntersectionObserver" in window)) {
      setShouldRender(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true)
          observer.disconnect()
        }
      },
      { rootMargin: observeMargin }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [observeMargin, shouldRender])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative min-h-[480px] overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-background shadow-lg shadow-primary/10",
        className
      )}
    >
      {shouldRender ? (
        <FeaturePrism />
      ) : (
        <div className="flex h-full min-h-[inherit] items-center justify-center bg-background/80 text-sm text-muted-foreground">
          Preparing interactive feature prism…
        </div>
      )}
    </div>
  )
}
