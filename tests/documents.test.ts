import {
  DocumentWithRelations,
  filterDocumentsForViewer,
  getNextLeaseVersionNumber,
  mapDocumensoStatusToDocumentStatus,
  resolveDocumentStatus,
} from "@/lib/documents-service";

const baseDocument: DocumentWithRelations = {
  id: "doc-1",
  tenant_id: "tenant-1",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  created_by: null,
  title: "Standard lease",
  documenso_template_id: "template-1",
  active_envelope_id: null,
  metadata: {},
  status: "draft",
  tenant: null,
  lease_versions: [],
};

function createLeaseVersion(version: number, status: DocumentWithRelations["status"], envelopeId: string) {
  return {
    id: `lease-${version}`,
    document_id: baseDocument.id,
    version,
    status,
    documenso_envelope_id: envelopeId,
    signers: [],
    sent_at: null,
    completed_at: null,
    expires_at: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  };
}

describe("documents-service", () => {
  it("restricts tenant visibility to their own documents", () => {
    const documents = [
      baseDocument,
      { ...baseDocument, id: "doc-2", tenant_id: "tenant-2" },
    ];

    const result = filterDocumentsForViewer(documents, "tenant-1", "tenant");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("doc-1");
  });

  it("allows managers to view all documents", () => {
    const documents = [
      baseDocument,
      { ...baseDocument, id: "doc-2", tenant_id: "tenant-2" },
    ];

    const result = filterDocumentsForViewer(documents, "manager-1", "property_manager");

    expect(result).toHaveLength(2);
  });

  it("maps Documenso statuses to local enum", () => {
    expect(mapDocumensoStatusToDocumentStatus("completed")).toBe("completed");
    expect(mapDocumensoStatusToDocumentStatus("READY")).toBe("sent");
    expect(mapDocumensoStatusToDocumentStatus("expired")).toBe("expired");
    expect(mapDocumensoStatusToDocumentStatus("unknown" as any)).toBe("draft");
  });

  it("calculates the next lease version number", () => {
    const document: DocumentWithRelations = {
      ...baseDocument,
      lease_versions: [
        createLeaseVersion(1, "completed", "env-1"),
        createLeaseVersion(3, "sent", "env-3"),
      ],
    };

    expect(getNextLeaseVersionNumber(document)).toBe(4);
  });

  it("prefers active envelope status when resolving document status", () => {
    const document: DocumentWithRelations = {
      ...baseDocument,
      status: "draft",
      active_envelope_id: "env-2",
      lease_versions: [
        createLeaseVersion(1, "completed", "env-1"),
        createLeaseVersion(2, "sent", "env-2"),
      ],
    };

    expect(resolveDocumentStatus(document)).toBe("sent");
  });

  it("falls back to document status when no versions are present", () => {
    const document: DocumentWithRelations = {
      ...baseDocument,
      status: "completed",
      lease_versions: [],
    };

    expect(resolveDocumentStatus(document)).toBe("completed");
  });
});
