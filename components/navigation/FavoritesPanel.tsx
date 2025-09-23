"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, Loader2, Pin, PinOff } from "lucide-react"

import type { FavoriteMetadata, FavoriteResponse } from "@/app/api/favorites/route"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type FavoriteToggleInput = {
  entityType: string
  entityId: string
  metadata?: FavoriteMetadata
}

type FavoritesContextValue = {
  favorites: FavoriteResponse[]
  isReady: boolean
  isReadOnly: boolean
  panelOpen: boolean
  openPanel: () => void
  closePanel: () => void
  toggleFavorite: (input: FavoriteToggleInput) => Promise<void>
  reorderFavorites: (orderedIds: string[]) => Promise<void>
  isFavorited: (entityType: string, entityId: string) => boolean
  isProcessing: (entityType: string, entityId: string) => boolean
}

const FavoritesContext = React.createContext<FavoritesContextValue | undefined>(
  undefined,
)

type FavoritesPayload = {
  favorites: FavoriteResponse[]
}

const FAVORITES_API = "/api/favorites"

const mapFavorite = (favorite: FavoriteResponse): FavoriteResponse => ({
  ...favorite,
  metadata: favorite.metadata,
})

const makeKey = (entityType: string, entityId: string) => `${entityType}::${entityId}`

export function FavoritesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [favorites, setFavorites] = React.useState<FavoriteResponse[]>([])
  const [panelOpen, setPanelOpen] = React.useState(false)
  const [isReady, setIsReady] = React.useState(false)
  const [isReadOnly, setIsReadOnly] = React.useState(false)
  const [pendingKeys, setPendingKeys] = React.useState<Set<string>>(new Set())

  const fetchFavorites = React.useCallback(async () => {
    try {
      const response = await fetch(FAVORITES_API)

      if (response.status === 401) {
        setFavorites([])
        setIsReadOnly(true)
        setIsReady(true)
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch favorites: ${response.status}`)
      }

      const payload = (await response.json()) as FavoritesPayload
      setFavorites(payload.favorites.map(mapFavorite))
      setIsReadOnly(false)
    } catch (error) {
      console.error("Unable to hydrate favorites", error)
    } finally {
      setIsReady(true)
    }
  }, [])

  React.useEffect(() => {
    void fetchFavorites()
  }, [fetchFavorites])

  const updatePending = React.useCallback((key: string, next: boolean) => {
    setPendingKeys((prev) => {
      const nextKeys = new Set(prev)
      if (next) {
        nextKeys.add(key)
      } else {
        nextKeys.delete(key)
      }
      return nextKeys
    })
  }, [])

  const toggleFavorite = React.useCallback(
    async ({ entityType, entityId, metadata }: FavoriteToggleInput) => {
      if (isReadOnly) {
        return
      }

      const key = makeKey(entityType, entityId)
      updatePending(key, true)

      try {
        const response = await fetch(FAVORITES_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityType, entityId, metadata }),
        })

        if (response.status === 401) {
          setIsReadOnly(true)
          return
        }

        if (!response.ok) {
          throw new Error(`Failed to toggle favorite: ${response.status}`)
        }

        const payload = (await response.json()) as FavoritesPayload
        setFavorites(payload.favorites.map(mapFavorite))
      } catch (error) {
        console.error("Unable to toggle favorite", error)
        await fetchFavorites()
      } finally {
        updatePending(key, false)
      }
    },
    [fetchFavorites, isReadOnly, updatePending],
  )

  const reorderFavorites = React.useCallback(
    async (orderedIds: string[]) => {
      if (isReadOnly) {
        return
      }

      if (!orderedIds.length) {
        return
      }

      try {
        const response = await fetch(FAVORITES_API, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        })

        if (response.status === 401) {
          setIsReadOnly(true)
          return
        }

        if (!response.ok) {
          throw new Error(`Failed to reorder favorites: ${response.status}`)
        }

        const payload = (await response.json()) as FavoritesPayload
        setFavorites(payload.favorites.map(mapFavorite))
      } catch (error) {
        console.error("Unable to reorder favorites", error)
        await fetchFavorites()
      }
    },
    [fetchFavorites, isReadOnly],
  )

  const openPanel = React.useCallback(() => setPanelOpen(true), [])
  const closePanel = React.useCallback(() => setPanelOpen(false), [])

  const isFavorited = React.useCallback(
    (entityType: string, entityId: string) =>
      favorites.some(
        (favorite) =>
          favorite.entityType === entityType && favorite.entityId === entityId,
      ),
    [favorites],
  )

  const isProcessing = React.useCallback(
    (entityType: string, entityId: string) =>
      pendingKeys.has(makeKey(entityType, entityId)),
    [pendingKeys],
  )

  const value = React.useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      isReady,
      isReadOnly,
      panelOpen,
      openPanel,
      closePanel,
      toggleFavorite,
      reorderFavorites,
      isFavorited,
      isProcessing,
    }),
    [
      favorites,
      isReady,
      isReadOnly,
      panelOpen,
      openPanel,
      closePanel,
      toggleFavorite,
      reorderFavorites,
      isFavorited,
      isProcessing,
    ],
  )

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = React.useContext(FavoritesContext)
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider")
  }
  return context
}

export function FavoritesPanel() {
  const {
    favorites,
    panelOpen,
    closePanel,
    openPanel,
    reorderFavorites,
    toggleFavorite,
    isProcessing,
    isReadOnly,
    isReady,
  } = useFavorites()

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (open) {
        openPanel()
      } else {
        closePanel()
      }
    },
    [closePanel, openPanel],
  )

  const handleMove = React.useCallback(
    (id: string, direction: "up" | "down") => {
      const ids = favorites.map((favorite) => favorite.id)
      const currentIndex = ids.indexOf(id)
      if (currentIndex === -1) {
        return
      }

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1

      if (targetIndex < 0 || targetIndex >= ids.length) {
        return
      }

      const nextOrder = [...ids]
      const [removed] = nextOrder.splice(currentIndex, 1)
      nextOrder.splice(targetIndex, 0, removed)

      void reorderFavorites(nextOrder)
    },
    [favorites, reorderFavorites],
  )

  const renderFavoriteLabel = React.useCallback(
    (favorite: FavoriteResponse) => {
      const label = favorite.metadata?.label ?? favorite.entityId
      const href = favorite.metadata?.href

      if (href) {
        return (
          <Link
            href={href}
            className="truncate text-sm font-medium text-primary underline-offset-2 hover:underline"
            onClick={closePanel}
          >
            {label}
          </Link>
        )
      }

      return <p className="truncate text-sm font-medium">{label}</p>
    },
    [closePanel],
  )

  return (
    <Sheet open={panelOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg",
            "border border-border bg-background/90 backdrop-blur",
          )}
          aria-label="Toggle favorites drawer"
        >
          <Pin className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full max-w-sm flex-col gap-6">
        <SheetHeader>
          <SheetTitle>Favorites</SheetTitle>
          <SheetDescription>
            Pin navigation items and documents to jump back to them quickly.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {!isReady ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`favorite-skeleton-${index}`}
                  className="h-12 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <div className="rounded-md border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
              {isReadOnly
                ? "Sign in to start pinning your go-to destinations."
                : "Use the pin icon on navigation links to save them here."}
            </div>
          ) : (
            <ul className="space-y-3">
              {favorites.map((favorite, index) => {
                const pending = isProcessing(
                  favorite.entityType,
                  favorite.entityId,
                )

                return (
                  <li
                    key={favorite.id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      {renderFavoriteLabel(favorite)}
                      <p className="truncate text-xs text-muted-foreground">
                        {favorite.metadata?.href ?? favorite.entityType}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Move favorite up"
                        onClick={() => handleMove(favorite.id, "up")}
                        disabled={index === 0 || pending}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Move favorite down"
                        onClick={() => handleMove(favorite.id, "down")}
                        disabled={index === favorites.length - 1 || pending}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Remove from favorites"
                        onClick={() =>
                          toggleFavorite({
                            entityType: favorite.entityType,
                            entityId: favorite.entityId,
                            metadata: favorite.metadata,
                          })
                        }
                        disabled={pending}
                      >
                        {pending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <PinOff className="size-4" />
                        )}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
