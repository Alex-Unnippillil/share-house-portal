"use client"

import * as React from "react"
import NextLink from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Pin, PinOff } from "lucide-react"

import type { FavoriteMetadata } from "@/app/api/favorites/route"

import { useFavorites } from "./FavoritesPanel"

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
   * Optional configuration to show a favorite pin toggle inline with the link.
   */
  favorite?: FavoriteToggleConfig
}

export interface FavoriteToggleConfig {
  entityType: string
  entityId: string
  metadata?: FavoriteMetadata
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
      href,
      favorite,
      children,
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

    const content = favorite ? (
      <span className="inline-flex w-full items-center gap-2">
        <span className="min-w-0 flex-1 truncate">{children}</span>
        <FavoriteToggleButton config={favorite} />
      </span>
    ) : (
      children ?? null
    )

    return (
      <NextLink
        ref={combinedRef}
        href={href}
        prefetch={shouldPrefetch}
        onPointerEnter={handlePointerEnter}
        onFocus={handleFocus}
        {...rest}
      >
        {content}
      </NextLink>
    )
  }
)

SmartLink.displayName = "SmartLink"

export default SmartLink

const FavoriteToggleButton = ({
  config,
}: {
  config: FavoriteToggleConfig
}) => {
  const { toggleFavorite, isFavorited, isProcessing, isReadOnly } = useFavorites()
  const isPinned = isFavorited(config.entityType, config.entityId)
  const pending = isProcessing(config.entityType, config.entityId)

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      if (pending || isReadOnly) {
        return
      }

      void toggleFavorite(config)
    },
    [config, isReadOnly, pending, toggleFavorite],
  )

  const ariaLabel = isPinned ? "Unpin from favorites" : "Pin to favorites"

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
      onClick={handleClick}
      disabled={pending || isReadOnly}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : isPinned ? (
        <PinOff className="size-4" />
      ) : (
        <Pin className="size-4" />
      )}
    </button>
  )
}
