import { describe, expect, it } from "vitest"

import {
  SHARE_INTENT_PATH,
  buildShareIntentUrl,
  coerceSharePayloadFromParams,
  determineShareDestination,
  parseFileNamesParam,
} from "@/lib/share/intent"
import {
  buildDocumentSharePayload,
  buildPaymentReceiptSharePayload,
  buildThreadSharePayload,
  resolveShareUrl,
} from "@/lib/share/outbound"
import type { DocumentWithLease } from "@/types/documents"
import type { PaymentReceiptHistoryEntry } from "@/types/payments"

describe("share target routing", () => {
  it("routes file based shares to documents", () => {
    const resolution = determineShareDestination({
      title: "Signed lease",
      text: "Latest lease draft",
      fileNames: ["unit-5a-lease.pdf"],
    }, null)

    expect(resolution.destination).toBe("documents")
    expect(resolution.reason).toContain("document")
  })

  it("detects payment terminology", () => {
    const resolution = determineShareDestination({
      text: "Rent payment receipt for April",
      url: "https://stripe.com/payments/receipt",
    }, null)

    expect(resolution.destination).toBe("payments")
  })

  it("detects visitor intents", () => {
    const resolution = determineShareDestination({
      text: "Guest stay request for my sister visiting this weekend",
    }, null)

    expect(resolution.destination).toBe("visitors")
  })

  it("detects maintenance issues", () => {
    const resolution = determineShareDestination({
      text: "Water heater leak needs urgent repair",
    }, null)

    expect(resolution.destination).toBe("maintenance")
  })

  it("falls back to messaging when no signals detected", () => {
    const resolution = determineShareDestination({
      text: "Check out this idea for our next roommate dinner",
    }, null)

    expect(resolution.destination).toBe("messaging")
  })

  it("honours explicit destination overrides", () => {
    const resolution = determineShareDestination(
      {
        text: "Attaching maintenance photos",
        fileNames: ["leak.jpg"],
      },
      "payments",
    )

    expect(resolution.destination).toBe("payments")
    expect(resolution.explicit).toBe(true)
  })

  it("builds a share intent URL with metadata", () => {
    const url = buildShareIntentUrl(
      {
        title: "Lease amendment",
        text: "Needs signature",
        url: "https://example.com/documents/123",
        fileNames: ["amendment.pdf"],
      },
      {
        destination: "documents",
        reason: "Detected shared files likely suited for document intake",
      },
    )

    expect(url).toContain(SHARE_INTENT_PATH)
    expect(url).toContain("destination=documents")
    expect(url).toContain("reason=")
    expect(url).toContain("files=%5B%22amendment.pdf%22%5D")
  })

  it("coerces payload from query parameters", () => {
    const payload = coerceSharePayloadFromParams({
      title: "Unit 5A visitor",
      text: "Guest arriving Friday",
      url: "https://roomsily.app",
      files: JSON.stringify(["guest-pass.pdf"]),
    })

    expect(payload.title).toBe("Unit 5A visitor")
    expect(payload.text).toContain("Guest")
    expect(payload.url).toBe("https://roomsily.app")
    expect(payload.fileNames).toEqual(["guest-pass.pdf"])
  })

  it("parses fallback file lists", () => {
    expect(parseFileNamesParam("one.png|two.jpg")).toEqual(["one.png", "two.jpg"])
  })
})

describe("outbound share payloads", () => {
  const baseDocument: DocumentWithLease = {
    id: "doc-1",
    created_at: "2023-01-01",
    updated_at: "2023-01-02",
    title: "Lease Agreement",
    description: "Primary lease for Unit 5A",
    document_type: "lease",
    status: "signed",
    state: "published",
    metadata: {},
    requires_signature: false,
    version: 1,
    file_url: "/documents/doc-1.pdf",
  } as DocumentWithLease

  const baseReceipt: PaymentReceiptHistoryEntry = {
    id: "rec-1",
    issuedTo: "Alex Tenant",
    paymentDate: "2024-03-01",
    currency: "USD",
    amount: 185000,
    status: "paid",
    paymentMethod: "Visa •••• 4242",
    receiptUrl: "/receipts/rec-1",
    lineItems: [
      { id: "item-1", description: "Rent", category: "rent", totalAmount: 185000 },
    ],
  }

  it("builds document share payloads with lease context", () => {
    const payload = buildDocumentSharePayload({
      ...baseDocument,
      lease: {
        id: "lease-1",
        document_id: "doc-1",
        created_at: "2023-01-01",
        updated_at: "2023-01-01",
        start_date: "2023-01-01",
        rent_frequency: "monthly",
        auto_renew: false,
        renewal_notice_days: 30,
        tenant_ids: [],
        status: "signed",
        unit_number: "5A",
        property_address: "456 Shared House Ln",
      },
    } as DocumentWithLease, { baseUrl: "https://roomsily.test" })

    expect(payload.title).toContain("Lease Agreement")
    expect(payload.url).toBe("https://roomsily.test/documents/doc-1.pdf")
    expect(payload.text).toContain("Unit 5A")
  })

  it("builds payment receipt payloads with formatted context", () => {
    const payload = buildPaymentReceiptSharePayload(baseReceipt, { baseUrl: "https://roomsily.test" })

    expect(payload.title).toContain("Receipt")
    expect(payload.text).toContain("Visa")
    expect(resolveShareUrl(baseReceipt.receiptUrl, "https://roomsily.test")).toBe(
      "https://roomsily.test/receipts/rec-1",
    )
    expect(payload.url).toBe("https://roomsily.test/receipts/rec-1")
  })

  it("builds messaging thread payloads with metadata", () => {
    const payload = buildThreadSharePayload(
      {
        id: "thread-1",
        title: "Chore rotation",
        summary: "Vote on the deep clean weekend",
        category: "Chores",
        participants: 4,
        lastMessageAt: "Today 9:00 AM",
        href: "/messaging?thread=thread-1",
      },
      { baseUrl: "https://roomsily.test" },
    )

    expect(payload.title).toContain("Chore rotation")
    expect(payload.text).toContain("4 roommates involved")
    expect(payload.url).toBe("https://roomsily.test/messaging?thread=thread-1")
  })

  it("does not alter absolute URLs when resolving", () => {
    const absolute = resolveShareUrl("https://example.com/path", "https://roomsily.test")
    expect(absolute).toBe("https://example.com/path")
  })
})
