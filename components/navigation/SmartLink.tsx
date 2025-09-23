"use client"

import * as React from "react"
import NextLink from "next/link"
import { useRouter } from "next/navigation"

import { recordRecentItemVisit } from "@/lib/data/recent-activity"
import useSupabaseBrowser from "@/utils/supabase-browser"

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
   * Optional metadata for persisting navigation history.
   */
  recentActivity?: {
    entityType: string
    entityId: string
    label: string
    route?: string
  }
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
      recentActivity,
      ...rest
    } = props

    const router = useRouter()
    const supabase = useSupabaseBrowser()
    const resolvedUserIdRef = React.useRef<string | null | undefined>(undefined)

    const resolveUserId = React.useCallback(async () => {
      if (resolvedUserIdRef.current !== undefined) {
        return resolvedUserIdRef.current
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        resolvedUserIdRef.current = user?.id ?? null
        return resolvedUserIdRef.current
      } catch (error) {
        resolvedUserIdRef.current = null
        throw error
      }
    }, [supabase])

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

    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) {
          return
        }

        if (!recentActivity) {
          return
        }

        const candidateRoute =
          recentActivity.route ?? (typeof href === "string" ? href : undefined)
        const shouldRecord =
          !!candidateRoute && typeof candidateRoute === "string" && candidateRoute.startsWith("/")

        if (!isInternalHref || !shouldRecord) {
          return
        }

        void (async () => {
          try {
            const userId = await resolveUserId()
            if (!userId) {
              return
            }

            await recordRecentItemVisit({
              client: supabase,
              userId,
              entityType: recentActivity.entityType,
              entityId: recentActivity.entityId,
              label: recentActivity.label,
              lastVisitedRoute: candidateRoute,
            })
          } catch (error) {
            console.error("Failed to record recent navigation", error)
          }
        })()
      },
      [href, isInternalHref, onClick, recentActivity, resolveUserId, supabase]
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
        onPointerEnter={handlePointerEnter}
        onFocus={handleFocus}
        onClick={handleClick}
        {...rest}
      />
    )
  }
)

SmartLink.displayName = "SmartLink"

export default SmartLink
