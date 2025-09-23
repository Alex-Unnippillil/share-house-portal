"use client"

import * as React from "react"
import NextLink from "next/link"
import { useRouter } from "next/navigation"

import {
  logNavigationPrefetchComplete,
  logNavigationPrefetchStart,
  type NavigationPrefetchTrigger,
} from "@/lib/analytics"

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
  /**
   * Fine tune the IntersectionObserver threshold used for viewport based prefetching.
   */
  viewportThreshold?: number | number[]
  /**
   * Opt-in flag to enable viewport driven prefetching even for hover-focused intents.
   */
  prefetchOnViewport?: boolean
}

type PrefetchHint = "never" | "hover" | "viewport" | "immediate"

type AnchorRef = HTMLAnchorElement | null

const createPrefetchRequestId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `prefetch-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const SmartLink = React.forwardRef<HTMLAnchorElement, SmartLinkProps>(
  (props, forwardedRef) => {
    const {
      intent = "standard",
      viewportMargin = "200px",
      viewportThreshold,
      prefetchOnViewport = false,
      prefetch: prefetchProp,
      onPointerEnter,
      onFocus,
      href,
      ...rest
    } = props

    const router = useRouter()
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

    const hasPrefetchedRef = React.useRef(false)
    const prefetchHint = React.useMemo<PrefetchHint>(() => {
      if (!isInternalHref) {
        return "never"
      }

      if (typeof prefetchProp === "boolean") {
        return prefetchProp ? "viewport" : "never"
      }

      switch (intent) {
        case "critical":
          return "immediate"
        case "passive":
        case "navigation":
          return "hover"
        case "standard":
        default:
          return "viewport"
      }
    }, [intent, isInternalHref, prefetchProp])

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

    const computedPrefetchProp = React.useMemo(() => {
      if (typeof prefetchProp === "boolean") {
        return prefetchProp
      }

      return false
    }, [prefetchProp])

    const allowManualPrefetch = computedPrefetchProp === false

    const triggerPrefetch = React.useCallback(
      (trigger: NavigationPrefetchTrigger) => {
        if (!allowManualPrefetch) {
          return
        }

        if (hasPrefetchedRef.current) {
          return
        }

        if (!prefetchHref) {
          return
        }

        hasPrefetchedRef.current = true

        const requestId = createPrefetchRequestId()
        const startedAt = Date.now()

        logNavigationPrefetchStart({
          id: requestId,
          href: prefetchHref,
          trigger,
          startedAt,
        })

        const finalize = (status: "success" | "error", error?: unknown) => {
          const finishedAt = Date.now()

          logNavigationPrefetchComplete({
            id: requestId,
            href: prefetchHref,
            trigger,
            startedAt,
            finishedAt,
            status,
            errorMessage:
              status === "error"
                ? error instanceof Error
                  ? error.message
                  : String(error)
                : undefined,
          })
        }

        try {
          const result = router.prefetch(prefetchHref)
          Promise.resolve(result)
            .then(() => {
              finalize("success")
            })
            .catch((error) => {
              finalize("error", error)
            })
        } catch (error) {
          finalize("error", error)
        }
      },
      [allowManualPrefetch, prefetchHref, router]
    )

    React.useEffect(() => {
      if (prefetchHint === "immediate") {
        triggerPrefetch("immediate")
      }
    }, [prefetchHint, triggerPrefetch])

    const enableViewportPrefetch = React.useMemo(() => {
      if (!allowManualPrefetch) {
        return false
      }

      if (prefetchHint === "never") {
        return false
      }

      return prefetchHint === "viewport" || prefetchOnViewport
    }, [allowManualPrefetch, prefetchHint, prefetchOnViewport])

    React.useEffect(() => {
      if (!enableViewportPrefetch) {
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
            triggerPrefetch("viewport")
            observer.disconnect()
          }
        },
        {
          rootMargin: viewportMargin,
          threshold: viewportThreshold,
        }
      )

      observer.observe(node)

      return () => {
        observer.disconnect()
      }
    }, [enableViewportPrefetch, triggerPrefetch, viewportMargin, viewportThreshold])

    const handlePointerEnter = React.useCallback(
      (event: React.PointerEvent<HTMLAnchorElement>) => {
        onPointerEnter?.(event)
        if (event.defaultPrevented) {
          return
        }

        if (prefetchHint === "never" || prefetchHint === "immediate") {
          return
        }

        triggerPrefetch("hover")
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

        triggerPrefetch("focus")
      },
      [onFocus, prefetchHint, triggerPrefetch]
    )

    return (
      <NextLink
        ref={combinedRef}
        href={href}
        prefetch={computedPrefetchProp}
        onPointerEnter={handlePointerEnter}
        onFocus={handleFocus}
        {...rest}
      />
    )
  }
)

SmartLink.displayName = "SmartLink"

export default SmartLink
