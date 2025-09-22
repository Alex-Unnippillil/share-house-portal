// @vitest-environment jsdom

import * as React from "react"
import "@testing-library/jest-dom/vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { DocumentWithLease } from "@/types/documents"
import type { CatchUpPaymentSubmissionResult } from "@/types/payments"
import { catchUpBalances } from "@/lib/payments/mock-data"

;(globalThis as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver =
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

const sampleDocument: DocumentWithLease = {
  id: "doc_memo",
  title: "Signed Lease",
  description: "Updated lease agreement",
  created_at: new Date("2024-03-01T10:00:00Z").toISOString(),
  updated_at: new Date("2024-03-02T10:00:00Z").toISOString(),
  document_type: "lease",
  status: "signed",
  tenant_id: "tenant_1",
  unit_id: "unit_2",
  file_url: "https://example.com/lease.pdf",
  requires_signature: true,
  expires_at: null,
  lease: {
    id: "lease_2",
    unit_id: "unit_2",
    start_date: "2024-03-01",
    end_date: "2025-02-28",
    tenant_ids: ["tenant_1"],
    rent_amount: 2200,
    status: "active",
    created_at: new Date("2024-03-01T00:00:00Z").toISOString(),
    updated_at: new Date("2024-03-01T00:00:00Z").toISOString(),
  },
  signatures: [
    {
      id: "sig_a",
      document_id: "doc_memo",
      signer_id: "tenant_1",
      signer_email: "tenant1@example.com",
      signer_name: "Casey Resident",
      status: "signed",
      signed_at: new Date("2024-03-02T10:00:00Z").toISOString(),
      created_at: new Date("2024-03-01T10:00:00Z").toISOString(),
      updated_at: new Date("2024-03-02T10:00:00Z").toISOString(),
    },
  ],
  access_logs: [],
}

const memoBalances = catchUpBalances.slice(0, 2)

describe("memoized component behaviour", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("avoids refetching documents when filter values stay stable", async () => {
    const mockGetDocumentsAction = vi.fn().mockResolvedValue({
      success: true,
      data: [sampleDocument],
    })

    vi.doMock("@/app/documents/actions", () => ({
      getDocumentsAction: mockGetDocumentsAction,
    }))

    vi.doMock("@/app/documents/components/document-actions", () => ({
      DocumentActions: () => <div data-testid="document-actions" />,
    }))

    vi.doMock("@/hooks/use-document-permissions", () => ({
      useDocumentPermissions: () => ({
        canViewDocument: () => true,
        canSignDocument: () => true,
        canCreateSigningRequests: true,
        canEditDocument: () => true,
      }),
    }))

    const { DocumentsList } = await import("@/app/documents/components/documents-list")

    const { rerender } = render(<DocumentsList filter={{ status: ["signed"] }} />)

    await waitFor(() => expect(mockGetDocumentsAction).toHaveBeenCalledTimes(1))
    await screen.findByText("Signed Lease")

    rerender(<DocumentsList filter={{ status: ["signed"] }} />)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockGetDocumentsAction).toHaveBeenCalledTimes(1)
  })
  it("does not recompute schemas when catch-up balances reference is unchanged", async () => {
    const mockSubmit = vi.fn<
      [parameters: { roommateId: string; amount: number; includePropertyManager: boolean; note?: string }],
      Promise<CatchUpPaymentSubmissionResult>
    >().mockResolvedValue({
      paymentIntentId: "pi_memo",
      roommateId: memoBalances[0]!.roommateId,
      roommateName: memoBalances[0]!.roommateName,
      amount: 100,
      currency: memoBalances[0]!.currency,
      projectedBalance: 0,
      allocations: [],
      recipients: [],
      note: undefined,
    })

    let schemaSpy: ((balances: typeof memoBalances) => ReturnType<typeof import("@/lib/payments/schemas").createCatchUpFormSchema>) | undefined

    vi.doMock("@/app/payments/actions", () => ({
      submitCatchUpPayment: mockSubmit,
    }))

    vi.doMock("@/lib/payments/schemas", async () => {
      const actual = await vi.importActual<typeof import("@/lib/payments/schemas")>(
        "@/lib/payments/schemas",
      )

      schemaSpy = vi.fn(actual.createCatchUpFormSchema)

      return {
        ...actual,
        createCatchUpFormSchema: schemaSpy!,
      }
    })

    const { CatchUpPaymentCard } = await import("@/app/payments/_components/catch-up-payment-card")

    const { rerender } = render(<CatchUpPaymentCard balances={memoBalances} />)

    await waitFor(() => expect(screen.getByText("One-time catch up")).toBeInTheDocument())
    expect(schemaSpy).toHaveBeenCalledTimes(1)

    rerender(<CatchUpPaymentCard balances={memoBalances} />)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(schemaSpy).toHaveBeenCalledTimes(1)
  })
})
