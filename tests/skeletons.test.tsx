import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

import {
  CardSkeleton,
  ListSkeleton,
  TableSkeleton,
  Skeleton,
} from "@/components/ui/skeletons"

describe("skeleton primitives", () => {
  it("renders metric card skeleton with accessible state", () => {
    const markup = renderToStaticMarkup(<CardSkeleton variant="metric" />)

    expect(markup).toContain("aria-busy=\"true\"")
    expect(markup).toContain("aria-live=\"polite\"")
    expect((markup.match(/h-8 w-1\/2/g) || []).length).toBe(1)
  })

  it("renders the requested number of list skeleton rows", () => {
    const count = 2
    const markup = renderToStaticMarkup(<ListSkeleton count={count} />)

    expect((markup.match(/h-6 w-20/g) || []).length).toBe(count)
  })

  it("renders a table skeleton with the expected grid", () => {
    const columns = 3
    const rows = 2
    const markup = renderToStaticMarkup(
      <TableSkeleton columns={columns} rows={rows} />
    )

    expect((markup.match(/<th\b/g) || []).length).toBe(columns)
    expect((markup.match(/<tr/g) || []).length).toBe(rows + 1) // include header row
  })

  it("hides individual skeleton blocks from assistive tech", () => {
    const markup = renderToStaticMarkup(<Skeleton className="h-4" />)

    expect(markup).toContain("aria-hidden=\"true\"")
  })
})
