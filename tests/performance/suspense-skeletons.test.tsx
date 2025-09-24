import React, { lazy, Suspense, type ReactElement } from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { DocumentsListSkeleton } from "@/app/documents/components/documents-list-skeleton"
import { MessagingThreadsSkeleton } from "@/app/messaging/_components/messaging-threads-skeleton"
import { RoommateLedgerSkeleton } from "@/app/payments/_components/roommate-ledger-skeleton"

function expectSkeletonFallback(fallback: ReactElement, resolvedCopy: string) {
  const delay = 450

  vi.useFakeTimers()
  try {
    const SlowComponent = lazy(() =>
      new Promise<{ default: () => JSX.Element }>((resolve) => {
        setTimeout(() => {
          resolve({
            default: () => <div>{resolvedCopy}</div>,
          })
        }, delay)
      }),
    )

    const html = renderToString(
      <Suspense fallback={fallback}>
        <SlowComponent />
      </Suspense>,
    )

    expect(html).toContain("animate-pulse")
    expect(html).not.toContain("animate-spin")

    vi.advanceTimersByTime(delay)
  } finally {
    vi.runAllTimers()
    vi.useRealTimers()
  }
}

describe("suspense fallbacks prefer skeletons", () => {
  it("uses the roommate ledger skeleton when data resolves after 400ms", () => {
    expectSkeletonFallback(<RoommateLedgerSkeleton />, "Ledger ready")
  })

  it("uses the messaging threads skeleton when thread data is slow", () => {
    expectSkeletonFallback(<MessagingThreadsSkeleton />, "Threads live")
  })

  it("uses the documents list skeleton during delayed fetches", () => {
    expectSkeletonFallback(<DocumentsListSkeleton />, "Documents hydrated")
  })
})
