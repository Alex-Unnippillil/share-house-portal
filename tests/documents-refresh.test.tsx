import { afterEach, describe, expect, it, vi } from "vitest"
import React from "react"
import { act } from "react-dom/test-utils"
import { createRoot } from "react-dom/client"

import { DocumentsList } from "@/app/documents/components/documents-list"
import type { DocumentListFilters, DocumentWithLease } from "@/types/documents"

const { getDocumentsAction } = vi.hoisted(() => ({
  getDocumentsAction: vi.fn(),
}))

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const { storeRefreshHandler, getRefreshHandler, resetRefreshHandler } = vi.hoisted(() => {
  let handler: (() => Promise<void> | void) | undefined
  return {
    storeRefreshHandler(fn?: () => Promise<void> | void) {
      handler = fn
    },
    getRefreshHandler: () => handler,
    resetRefreshHandler() {
      handler = undefined
    },
  }
})

vi.mock("@/app/documents/actions", () => ({
  getDocumentsAction,
}))

vi.mock("@/app/documents/components/document-actions", () => ({
  DocumentActions: () => null,
}))

vi.mock("@/components/pull-to-refresh", () => ({
  PullToRefresh: ({ onRefresh, children }: any) => {
    storeRefreshHandler(onRefresh)
    return <div data-testid="pull-mock">{children}</div>
  },
}))

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

describe("DocumentsList pull-to-refresh", () => {
  afterEach(() => {
    getDocumentsAction.mockReset()
    resetRefreshHandler()
  })

  it("refetches documents when the refresh handler runs", async () => {
    const baseDocument: DocumentWithLease = {
      id: "doc-1",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      title: "Lease agreement v1",
      description: "Initial version",
      document_type: "lease",
      status: "draft",
      metadata: {},
      requires_signature: true,
      version: 1,
    }

    const updatedDocument: DocumentWithLease = {
      ...baseDocument,
      id: "doc-1",
      updated_at: "2024-02-01T00:00:00.000Z",
      title: "Lease agreement v2",
      status: "pending_signature",
    }

    getDocumentsAction
      .mockResolvedValueOnce({ success: true, data: [baseDocument] })
      .mockResolvedValueOnce({ success: true, data: [updatedDocument] })

    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<DocumentsList filter={{} as DocumentListFilters} />)
    })

    await flushPromises()

    expect(container.textContent).toContain("Lease agreement v1")

    const refreshHandler = getRefreshHandler()
    expect(refreshHandler).toBeTruthy()

    await act(async () => {
      await refreshHandler?.()
    })

    await flushPromises()

    expect(getDocumentsAction).toHaveBeenCalledTimes(2)
    expect(container.textContent).toContain("Lease agreement v2")

    act(() => {
      root.unmount()
    })
    document.body.removeChild(container)
  })
})
