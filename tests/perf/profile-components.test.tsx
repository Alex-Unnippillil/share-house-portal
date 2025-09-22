// @vitest-environment jsdom

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import * as React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import fs from "node:fs"
import path from "node:path"

(globalThis as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver =
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

import type { DocumentWithLease } from "@/types/documents"
import type { CatchUpPaymentSubmissionResult } from "@/types/payments"
import { catchUpBalances } from "@/lib/payments/mock-data"

import { DocumentsList } from "@/app/documents/components/documents-list"
import { CatchUpPaymentCard } from "@/app/payments/_components/catch-up-payment-card"

vi.mock("@/app/documents/components/document-actions", () => ({
  DocumentActions: () => <div data-testid="document-actions" />,
}))

vi.mock("@/hooks/use-document-permissions", () => ({
  useDocumentPermissions: () => ({
    canViewDocument: () => true,
    canSignDocument: () => true,
    canCreateSigningRequests: true,
    canEditDocument: () => true,
  }),
}))

const mockGetDocumentsAction = vi.fn()
vi.mock("@/app/documents/actions", () => ({
  getDocumentsAction: (...args: unknown[]) => mockGetDocumentsAction(...args),
}))

const mockSubmitCatchUpPayment = vi.fn<
  [parameters: { roommateId: string; amount: number; includePropertyManager: boolean; note?: string }],
  Promise<CatchUpPaymentSubmissionResult>
>()

vi.mock("@/app/payments/actions", () => ({
  submitCatchUpPayment: (...args: Parameters<typeof mockSubmitCatchUpPayment>) =>
    mockSubmitCatchUpPayment(...args),
}))

const documentsProfileEntries: Array<Record<string, unknown>> = []
const paymentsProfileEntries: Array<Record<string, unknown>> = []

const sampleDocuments: DocumentWithLease[] = [
  {
    id: "doc_1",
    title: "Lease Agreement",
    description: "Primary lease document",
    created_at: new Date("2024-01-05T12:00:00Z").toISOString(),
    updated_at: new Date("2024-02-01T12:00:00Z").toISOString(),
    document_type: "lease",
    status: "pending_signature",
    tenant_id: "tenant_1",
    unit_id: "unit_1",
    file_url: "https://example.com/lease.pdf",
    requires_signature: true,
    expires_at: null,
    lease: {
      id: "lease_1",
      unit_id: "unit_1",
      start_date: "2024-01-01",
      end_date: "2024-12-31",
      tenant_ids: ["tenant_1", "tenant_2"],
      rent_amount: 2400,
      status: "active",
      created_at: new Date("2024-01-01T00:00:00Z").toISOString(),
      updated_at: new Date("2024-01-01T00:00:00Z").toISOString(),
    },
    signatures: [
      {
        id: "sig_1",
        document_id: "doc_1",
        signer_id: "tenant_1",
        signer_email: "tenant1@example.com",
        signer_name: "Alex Tenant",
        status: "signed",
        signed_at: new Date("2024-01-06T12:00:00Z").toISOString(),
        created_at: new Date("2024-01-05T12:00:00Z").toISOString(),
        updated_at: new Date("2024-01-06T12:00:00Z").toISOString(),
      },
      {
        id: "sig_2",
        document_id: "doc_1",
        signer_id: "tenant_2",
        signer_email: "tenant2@example.com",
        signer_name: "Jamie Roommate",
        status: "pending",
        signed_at: null,
        created_at: new Date("2024-01-05T12:00:00Z").toISOString(),
        updated_at: new Date("2024-01-06T12:00:00Z").toISOString(),
      },
    ],
    access_logs: [],
  },
]

function recordEntry(store: Array<Record<string, unknown>>, data: Parameters<React.ProfilerOnRenderCallback>) {
  const [id, phase, actualDuration, baseDuration, startTime, commitTime] = data
  store.push({
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  })
}

function persistProfiles() {
  const outputDir = process.env.PROFILE_OUTPUT_DIR
  if (!outputDir) {
    return
  }

  const tag = process.env.PROFILE_PHASE ?? "snapshot"
  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(
    path.join(outputDir, `documents-${tag}.json`),
    JSON.stringify(documentsProfileEntries, null, 2),
    "utf8",
  )
  fs.writeFileSync(
    path.join(outputDir, `payments-${tag}.json`),
    JSON.stringify(paymentsProfileEntries, null, 2),
    "utf8",
  )
}

beforeEach(() => {
  mockGetDocumentsAction.mockReset()
  mockSubmitCatchUpPayment.mockReset()
})

afterAll(() => {
  persistProfiles()
})

describe("profile snapshots", () => {
  it("captures document list render profile", async () => {
    documentsProfileEntries.length = 0
    mockGetDocumentsAction.mockResolvedValue({ success: true, data: sampleDocuments })

    render(
      <React.Profiler id="DocumentsList" onRender={(...args) => recordEntry(documentsProfileEntries, args)}>
        <DocumentsList filter={{ status: ["pending_signature"] }} />
      </React.Profiler>,
    )

    await waitFor(() => expect(mockGetDocumentsAction).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText("Lease Agreement")).toBeInTheDocument())

    expect(documentsProfileEntries.length).toBeGreaterThan(0)
  })

  it("captures payment form render profile", async () => {
    paymentsProfileEntries.length = 0
    const result: CatchUpPaymentSubmissionResult = {
      paymentIntentId: "pi_test",
      roommateId: catchUpBalances[0]!.roommateId,
      roommateName: catchUpBalances[0]!.roommateName,
      amount: 120,
      currency: catchUpBalances[0]!.currency,
      projectedBalance: 0,
      allocations: [],
      recipients: [],
      note: undefined,
    }

    mockSubmitCatchUpPayment.mockResolvedValue(result)

    render(
      <React.Profiler id="CatchUpPaymentCard" onRender={(...args) => recordEntry(paymentsProfileEntries, args)}>
        <CatchUpPaymentCard balances={catchUpBalances.slice(0, 2)} />
      </React.Profiler>,
    )

    await waitFor(() => expect(screen.getByText("One-time catch up")).toBeInTheDocument())
    expect(paymentsProfileEntries.length).toBeGreaterThan(0)
  })
})
