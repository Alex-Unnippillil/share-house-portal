import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase";
import {
  buildLeaseSummaries,
  canTransitionLeaseDocumentStatus,
  formatLeaseDocumentStatus,
  mapDocumensoStatus,
} from "@/lib/lease-documents";

const baseLease: Database["public"]["Tables"]["leases"]["Row"] = {
  id: "lease-1",
  title: "Unit 4B Lease",
  description: "Primary lease agreement",
  effective_date: "2024-01-01",
  termination_date: null,
  documenso_template_id: null,
  metadata: {},
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
};

const baseDocument: Database["public"]["Tables"]["lease_documents"]["Row"] = {
  id: "document-1",
  lease_id: baseLease.id,
  name: "Residential Lease",
  status: "awaiting_signature",
  documenso_document_id: "doc-123",
  documenso_envelope_id: null,
  documenso_download_url: null,
  signing_embed_url: null,
  storage_path: null,
  requested_at: "2024-01-02T12:00:00.000Z",
  completed_at: null,
  last_synced_at: null,
  created_at: "2024-01-02T11:00:00.000Z",
  updated_at: "2024-01-02T11:00:00.000Z",
  metadata: {},
};

const baseResidentLease: Database["public"]["Tables"]["resident_leases"]["Row"] = {
  id: "resident-lease-1",
  lease_id: baseLease.id,
  resident_id: "user-1",
  role: "tenant",
  is_primary: true,
  documenso_recipient_id: "recipient-1",
  signed_at: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

describe("Documenso status mapping", () => {
  it("maps various Documenso statuses to lease document statuses", () => {
    expect(mapDocumensoStatus("COMPLETED")).toBe("completed");
    expect(mapDocumensoStatus("declined")).toBe("declined");
    expect(mapDocumensoStatus("voided")).toBe("cancelled");
    expect(mapDocumensoStatus("sent")).toBe("awaiting_signature");
    expect(mapDocumensoStatus(undefined)).toBe("awaiting_signature");
  });
});

describe("Lease document status transitions", () => {
  it("allows valid transitions", () => {
    expect(canTransitionLeaseDocumentStatus("draft", "awaiting_signature")).toBe(true);
    expect(canTransitionLeaseDocumentStatus("awaiting_signature", "completed")).toBe(true);
    expect(canTransitionLeaseDocumentStatus("declined", "awaiting_signature")).toBe(true);
  });

  it("prevents invalid transitions", () => {
    expect(canTransitionLeaseDocumentStatus("completed", "awaiting_signature")).toBe(false);
    expect(canTransitionLeaseDocumentStatus("cancelled", "completed")).toBe(false);
  });
});

describe("Lease summaries", () => {
  it("builds summaries sorted by request time", () => {
    const leases = buildLeaseSummaries(
      [
        {
          ...baseLease,
          lease_documents: [
            baseDocument,
            {
              ...baseDocument,
              id: "document-2",
              name: "Addendum",
              requested_at: "2024-01-03T10:00:00.000Z",
              created_at: "2024-01-03T09:00:00.000Z",
            },
          ],
          resident_leases: [baseResidentLease],
        },
      ],
      "user-1",
    );

    expect(leases).toHaveLength(1);
    const [summary] = leases;
    expect(summary.assignment?.role).toBe("tenant");
    expect(summary.documents).toHaveLength(2);
    expect(summary.documents[0].id).toBe("document-2");
    expect(formatLeaseDocumentStatus(summary.documents[0].status)).toBe("Awaiting signature");
  });

  it("returns an empty array when leases are undefined", () => {
    expect(buildLeaseSummaries(undefined, "user-1")).toEqual([]);
  });
});
