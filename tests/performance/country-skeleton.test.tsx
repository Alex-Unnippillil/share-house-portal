import React, { Suspense, lazy } from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { CountryDetailSkeleton } from "@/app/countries/_components/country-detail-skeleton"

function renderWithSlowChild() {
  const SlowCountry = lazy(() =>
    new Promise<{ default: () => JSX.Element }>((resolve) => {
      setTimeout(() => {
        resolve({
          default: () => (
            <section aria-busy="false" className="space-y-6">
              <h1>Country resolved</h1>
            </section>
          ),
        })
      }, 400)
    }),
  )

  return renderToString(
    <Suspense fallback={<CountryDetailSkeleton />}>
      <SlowCountry />
    </Suspense>,
  )
}

describe("country skeleton", () => {
  it("renders shimmer placeholders while data loads", () => {
    vi.useFakeTimers()
    try {
      const html = renderWithSlowChild()

      expect(html).toContain("aria-busy=\"true\"")
      expect(html).toContain("animate-pulse")
      expect(html).toContain("Loading country details…")
    } finally {
      vi.runAllTimers()
      vi.useRealTimers()
    }
  })
})
