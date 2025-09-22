import { Fragment } from "react"

import { Separator } from "@/components/ui/separator"

import { PendingSwapCard } from "./pending-swap-card"
import type { ChoreSwapWithAssignments, SwapActionResult } from "./types"

type PendingSwapListProps = {
  viewerId: string
  swaps: ChoreSwapWithAssignments[]
  acceptAction: (formData: FormData) => Promise<SwapActionResult>
  declineAction: (formData: FormData) => Promise<SwapActionResult>
}

type Section = {
  title: string
  emptyCopy: string
  swaps: ChoreSwapWithAssignments[]
  canRespond: boolean
}

export function PendingSwapList({ viewerId, swaps, acceptAction, declineAction }: PendingSwapListProps) {
  const incoming = swaps.filter((swap) => swap.status === "pending" && swap.counterparty_id === viewerId)
  const outgoing = swaps.filter((swap) => swap.status === "pending" && swap.requester_id === viewerId)
  const resolved = swaps.filter((swap) => swap.status !== "pending")

  const sections: Section[] = [
    {
      title: "Requests waiting for your response",
      emptyCopy: "No incoming swap requests at the moment.",
      swaps: incoming,
      canRespond: true,
    },
    {
      title: "Requests you&apos;ve sent",
      emptyCopy: "You haven&apos;t proposed any swaps yet.",
      swaps: outgoing,
      canRespond: false,
    },
    {
      title: "Recently resolved",
      emptyCopy: "No swap history yet.",
      swaps: resolved,
      canRespond: false,
    },
  ]

  return (
    <div className="space-y-10">
      {sections.map((section, index) => (
        <Fragment key={section.title}>
          <section className="space-y-4">
            <header className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
              <Separator className="w-20" />
            </header>
            {section.swaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">{section.emptyCopy}</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {section.swaps.map((swap) => (
                  <PendingSwapCard
                    key={swap.id}
                    swap={swap}
                    viewerId={viewerId}
                    canRespond={section.canRespond && swap.status === "pending"}
                    acceptAction={acceptAction}
                    declineAction={declineAction}
                  />
                ))}
              </div>
            )}
          </section>
          {index < sections.length - 1 ? <Separator /> : null}
        </Fragment>
      ))}
    </div>
  )
}

export default PendingSwapList
