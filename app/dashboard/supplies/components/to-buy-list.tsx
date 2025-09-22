"use client"

import React from "react"
import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { format } from "date-fns"
import { CheckCircle2, RotateCcw } from "lucide-react"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Database } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import useSupabaseBrowser from "@/utils/supabase-browser"

import { recordPurchaseAction, reopenToBuyItemAction } from "../actions"

type ToBuyItem = Database["public"]["Tables"]["to_buy_items"]["Row"]

type Props = {
  initialItems: ToBuyItem[]
}

function sortItems(items: ToBuyItem[]) {
  return [...items].sort((a, b) => {
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
    return aDate - bDate
  })
}

function formatFulfilledAt(fulfilledAt: string | null) {
  if (!fulfilledAt) {
    return null
  }

  const parsed = new Date(fulfilledAt)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return format(parsed, "MMM d, yyyy")
}

export default function ToBuyList({ initialItems }: Props) {
  const supabase = useSupabaseBrowser()
  const [items, setItems] = useState<ToBuyItem[]>(() => sortItems(initialItems))
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setItems(sortItems(initialItems))
  }, [initialItems])

  const handleRealtimeChange = useCallback(
    (payload: RealtimePostgresChangesPayload<ToBuyItem>) => {
      setItems((current) => {
        if (payload.eventType === "DELETE" && payload.old) {
          const deleted = payload.old as ToBuyItem
          return current.filter((item) => item.id !== deleted.id)
        }

        const incoming = payload.new as ToBuyItem | null

        if (!incoming) {
          return current
        }

        const index = current.findIndex((item) => item.id === incoming.id)

        if (index === -1) {
          return sortItems([...current, incoming])
        }

        const next = [...current]
        next[index] = { ...next[index], ...incoming }

        return sortItems(next)
      })
    },
    []
  )

  useEffect(() => {
    const channel = supabase
      .channel("public:to_buy_items")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "to_buy_items" },
        handleRealtimeChange
      )

    const subscription = channel.subscribe()

    return () => {
      Promise.resolve(subscription).then((resolved) => {
        supabase.removeChannel(resolved)
      })
    }
  }, [handleRealtimeChange, supabase])

  const pendingCount = useMemo(() => items.filter((item) => !item.fulfilled_at).length, [items])

  const handleMarkPurchased = useCallback(
    (item: ToBuyItem) => {
      const originalFulfilledAt = item.fulfilled_at
      setActiveItemId(item.id)
      setItems((current) =>
        current.map((existing) =>
          existing.id === item.id
            ? { ...existing, fulfilled_at: new Date().toISOString() }
            : existing
        )
      )

      startTransition(async () => {
        try {
          await recordPurchaseAction({ supply_item_id: item.supply_item_id })
        } catch (error) {
          console.error("Failed to record purchase", error)
          setItems((current) =>
            current.map((existing) =>
              existing.id === item.id
                ? { ...existing, fulfilled_at: originalFulfilledAt }
                : existing
            )
          )
        } finally {
          setActiveItemId(null)
        }
      })
    },
    [startTransition]
  )

  const handleReopen = useCallback(
    (item: ToBuyItem) => {
      const originalFulfilledAt = item.fulfilled_at
      setActiveItemId(item.id)
      setItems((current) =>
        current.map((existing) =>
          existing.id === item.id ? { ...existing, fulfilled_at: null } : existing
        )
      )

      startTransition(async () => {
        try {
          await reopenToBuyItemAction({ id: item.id })
        } catch (error) {
          console.error("Failed to reopen to-buy item", error)
          setItems((current) =>
            current.map((existing) =>
              existing.id === item.id
                ? { ...existing, fulfilled_at: originalFulfilledAt }
                : existing
            )
          )
        } finally {
          setActiveItemId(null)
        }
      })
    },
    [startTransition]
  )

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        The pantry is fully stocked. Add a new item when something runs low.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {items.map((item) => {
          const isMutating = isPending && activeItemId === item.id
          const fulfilledCopy = formatFulfilledAt(item.fulfilled_at)

          return (
            <li
              key={item.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-4 text-sm transition-colors",
                item.fulfilled_at && "border-muted-foreground/40 bg-muted"
              )}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p
                  className={cn(
                    "font-medium",
                    item.fulfilled_at && "text-muted-foreground line-through"
                  )}
                >
                  {item.name ?? "Untitled item"}
                </p>
                {item.notes ? (
                  <p className="text-xs text-muted-foreground">{item.notes}</p>
                ) : null}
                {item.quantity ? (
                  <p className="text-xs text-muted-foreground">Needed: {item.quantity}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={item.fulfilled_at ? "secondary" : "outline"}
                  className="whitespace-nowrap"
                >
                  {item.fulfilled_at
                    ? fulfilledCopy
                      ? `Fulfilled ${fulfilledCopy}`
                      : "Fulfilled"
                    : "Needs purchase"}
                </Badge>
                {item.fulfilled_at ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReopen(item)}
                    disabled={isMutating}
                  >
                    <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                    Reopen
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleMarkPurchased(item)}
                    disabled={isMutating}
                  >
                    <CheckCircle2 className="mr-2 size-4" aria-hidden="true" />
                    Mark purchased
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        {pendingCount === 0
          ? "All shared supplies have been fulfilled."
          : `${pendingCount} item${pendingCount === 1 ? "" : "s"} still need${
              pendingCount === 1 ? "s" : ""
            } attention.`}
      </p>
    </div>
  )
}
