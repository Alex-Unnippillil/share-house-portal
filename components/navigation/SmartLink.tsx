"use client"

import * as React from "react"
import NextLink from "next/link"
import { useRouter } from "next/navigation"

import {
  SMARTLINK_MODE_EVENT,
  initializeSmartLinkMetrics,
  type SmartLinkMode,
  type SmartLinkModeChangeDetail,
} from "@/components/navigation/smart-link-metrics"

export type SmartLinkIntent = "standard" | "critical" | "passive" | "navigation"

export interface SmartLinkProps
  extends React.ComponentPropsWithoutRef<typeof NextLink> {
  /**
   * Hint the prefetch heuristics about how aggressively we should warm up the route.
   * - `standard`: prefetch when the link nears the viewport (default).
   * - `critical`: prefetch immediately on mount.
   * - `passive`: wait for user intent such as hover/focus before prefetching.
   * - `navigation`: treat as part of a dense nav/table cluster and only prefetch on intent.
   */
  intent?: SmartLinkIntent
  /**
   * Custom root margin applied to the IntersectionObserver used for viewport based prefetching.
   */
  viewportMargin?: string
}

type PrefetchHint = "never" | "hover" | "viewport" | "immediate"

type AnchorRef = HTMLAnchorElement | null

export const SmartLink = React.forwardRef<HTMLAnchorElement, SmartLinkProps>(
  (props, forwardedRef) => {
    const {
      intent = "standard",
      viewportMargin = "200px",
      prefetch: prefetchProp,
      onPointerEnter,
      onFocus,
      onClick,
      href,
      ...rest
    } = props

    const router = useRouter()
    const [performanceMode, setPerformanceMode] = React.useState<SmartLinkMode>("default")
    const innerRef = React.useRef<HTMLAnchorElement | null>(null)
    const combinedRef = React.useCallback(
      (node: AnchorRef) => {
        innerRef.current = node
        if (typeof forwardedRef === "function") {
          forwardedRef(node)
        } else if (forwardedRef) {
          forwardedRef.current = node
        }
      },
      [forwardedRef]
    )

    const isInternalHref = React.useMemo(() => {
      if (typeof href === "string") {
        return href.startsWith("/") && !href.startsWith("//")
      }
      if (typeof href === "object") {
        return true
      }
      return false
    }, [href])

    const [isVisible, setIsVisible] = React.useState(false)
    const hasPrefetchedRef = React.useRef(false)

    React.useEffect(() => {
      if (typeof window === "undefined") {
        return
      }

      initializeSmartLinkMetrics()

      const handleModeChange = (event: Event) => {
        const detail = (event as CustomEvent<SmartLinkModeChangeDetail>).detail
        const nextMode = detail?.mode ?? window.__smartlinkNavigationMetrics?.mode ?? "default"
        setPerformanceMode(nextMode)
      }

      const currentMode = window.__smartlinkNavigationMetrics?.mode ?? "default"
      setPerformanceMode(currentMode)

      window.addEventListener(SMARTLINK_MODE_EVENT, handleModeChange as EventListener)

      return () => {
        window.removeEventListener(SMARTLINK_MODE_EVENT, handleModeChange as EventListener)
      }
    }, [])

    const effectiveIntent = React.useMemo(() => {
      if (intent === "standard" && performanceMode === "aggressive") {
        return "critical"
      }

      return intent
    }, [intent, performanceMode])

    const prefetchHint = React.useMemo<PrefetchHint>(() => {
      if (!isInternalHref) {
        return "never"
      }

      if (typeof prefetchProp === "boolean") {
        return prefetchProp ? "viewport" : "never"
      }

      switch (effectiveIntent) {
        case "critical":
          return "immediate"
        case "passive":
        case "navigation":
          return "hover"
        case "standard":
        default:
          return "viewport"
      }
    }, [effectiveIntent, isInternalHref, prefetchProp])

    const prefetchHref = React.useMemo(() => {
      if (!isInternalHref) {
        return undefined
      }

      if (typeof href === "string") {
        if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
          return undefined
        }
        return href
      }

      return undefined
    }, [href, isInternalHref])

    React.useEffect(() => {
      if (prefetchHint !== "viewport") {
        return
      }

      const node = innerRef.current
      if (!node || typeof IntersectionObserver === "undefined") {
        return
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (entry?.isIntersecting) {
            setIsVisible(true)
            observer.disconnect()
          }
        },
        { rootMargin: viewportMargin }
      )

      observer.observe(node)

      return () => {
        observer.disconnect()
      }
    }, [prefetchHint, viewportMargin])

    const triggerPrefetch = React.useCallback(() => {
      if (hasPrefetchedRef.current) {
        return
      }

      if (!prefetchHref) {
        return
      }

      router.prefetch(prefetchHref)
      hasPrefetchedRef.current = true
    }, [prefetchHref, router])

    React.useEffect(() => {
      if (prefetchHint === "immediate") {
        triggerPrefetch()
      }
    }, [prefetchHint, triggerPrefetch])

    React.useEffect(() => {
      if (prefetchHint === "viewport" && isVisible && prefetchHref) {
        hasPrefetchedRef.current = true
      }
    }, [isVisible, prefetchHint, prefetchHref])

    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (isInternalHref && typeof window !== "undefined" && typeof performance !== "undefined") {
          window.__smartlinkNavigationStart = {
            href: typeof href === "string" ? href : undefined,
            startedAt: performance.now(),
          }
        }

        onClick?.(event)

        if (event.defaultPrevented && typeof window !== "undefined") {
          window.__smartlinkNavigationStart = undefined
        }
      },
      [href, isInternalHref, onClick]
    )

    const handlePointerEnter = React.useCallback(
      (event: React.PointerEvent<HTMLAnchorElement>) => {
        onPointerEnter?.(event)
        if (event.defaultPrevented) {
          return
        }

        if (prefetchHint === "never" || prefetchHint === "immediate") {
          return
        }

        triggerPrefetch()
      },
      [onPointerEnter, prefetchHint, triggerPrefetch]
    )

    const handleFocus = React.useCallback(
      (event: React.FocusEvent<HTMLAnchorElement>) => {
        onFocus?.(event)
        if (event.defaultPrevented) {
          return
        }

        if (prefetchHint === "never" || prefetchHint === "immediate") {
          return
        }

        triggerPrefetch()
      },
      [onFocus, prefetchHint, triggerPrefetch]
    )

    const shouldPrefetch = React.useMemo(() => {
      if (!isInternalHref) {
        return false
      }

      switch (prefetchHint) {
        case "immediate":
          return true
        case "viewport":
          return isVisible
        case "hover":
        case "never":
        default:
          return false
      }
    }, [isInternalHref, isVisible, prefetchHint])

    return (
      <NextLink
        ref={combinedRef}
        href={href}
        prefetch={shouldPrefetch}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onFocus={handleFocus}
        {...rest}
      />
    )
  }
)

SmartLink.displayName = "SmartLink"

export default SmartLink
