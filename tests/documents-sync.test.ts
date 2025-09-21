import { describe, expect, it } from "vitest";
import { buildLeaseSyncResult } from "@/lib/documents-sync";
import { normalizeEnvelopeStatus } from "@/lib/documenso-client";

describe("buildLeaseSyncResult", () => {
  it("promotes the envelope status and extracts signer metadata", () => {
    const event = {
      type: "envelope.completed",
      data: {
        envelope: {
          id: "env-123",
          status: "completed",
          completed_at: "2024-04-01T12:00:00.000Z",
          expires_at: "2024-06-01T00:00:00.000Z",
        },
        signers: [
          {
            id: "signer-1",
            name: "Jamie Tenant",
            email: "jamie@example.com",
            role: "tenant",
            status: "completed",
            signing_order: 1,
            signed_at: "2024-04-01T12:00:00.000Z",
          },
        ],
      },
    };

    const result = buildLeaseSyncResult(event, "sent");

    expect(result.envelopeId).toBe("env-123");
    expect(result.leaseUpdate).toMatchObject({
      status: "completed",
      completed_at: "2024-04-01T12:00:00.000Z",
      expires_at: "2024-06-01T00:00:00.000Z",
    });
    expect(result.signerUpdates).toHaveLength(1);
    expect(result.signerUpdates[0]).toMatchObject({
      documenso_signer_id: "signer-1",
      email: "jamie@example.com",
      status: "completed",
    });
  });

  it("does not downgrade an existing completed status", () => {
    const event = {
      type: "envelope.sent",
      data: {
        envelope: {
          id: "env-123",
          status: "sent",
        },
      },
    };

    const result = buildLeaseSyncResult(event, "completed");

    expect(result.leaseUpdate.status).toBeUndefined();
    expect(result.leaseUpdate.completed_at).toBeUndefined();
  });

  it("normalizes unknown signer states", () => {
    const event = {
      type: "envelope.sent",
      data: {
        envelope: {
          id: "env-789",
          status: "SENT",
        },
        signers: [
          {
            id: "signer-2",
            name: "Alex Manager",
            email: "alex@example.com",
            status: "ViEwEd",
          },
        ],
      },
    };

    const result = buildLeaseSyncResult(event, null);

    expect(result.leaseUpdate.status).toBe("sent");
    expect(result.signerUpdates[0].status).toBe(
      normalizeEnvelopeStatus("ViEwEd"),
    );
  });
});
