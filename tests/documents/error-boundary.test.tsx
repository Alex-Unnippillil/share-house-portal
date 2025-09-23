import React from "react"

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import { DocumentsList } from "@/app/documents/components/documents-list"
import { DocumentsStats } from "@/app/documents/components/documents-stats"

const actionsMock = vi.hoisted(() => ({
  getDocumentsAction: vi.fn(),
  getDocumentStatsAction: vi.fn(),
  uploadDocumentAction: vi.fn(),
  createSigningRequestAction: vi.fn(),
  signDocumentAction: vi.fn(),
  getSigningUrlAction: vi.fn(),
}))

vi.mock("@/app/documents/actions", () => actionsMock)

describe("documents error boundaries", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeAll(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  beforeEach(() => {
    actionsMock.getDocumentsAction.mockReset()
    actionsMock.getDocumentStatsAction.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders fallback when document listing action rejects", async () => {
    actionsMock.getDocumentsAction.mockRejectedValueOnce(new Error("Documents request failed"))

    render(
      <ErrorBoundary>
        <DocumentsList filter={{}} />
      </ErrorBoundary>
    )

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Something went wrong")
    expect(alert.textContent).toContain("Documents request failed")
  })

  it("renders fallback when document stats action rejects", async () => {
    actionsMock.getDocumentStatsAction.mockRejectedValueOnce(new Error("Stats request failed"))

    render(
      <ErrorBoundary>
        <DocumentsStats />
      </ErrorBoundary>
    )

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Something went wrong")
    expect(alert.textContent).toContain("Stats request failed")
  })
})
