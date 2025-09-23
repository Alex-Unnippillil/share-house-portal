import { describe, expect, it } from "vitest";

import {
  documentUploadSchema,
  MAX_DOCUMENT_FILE_SIZE,
} from "@/app/documents/actions/schemas";

const basePayload = {
  title: "Lease Agreement",
  document_type: "lease" as const,
  requires_signature: false,
};

const createFile = (size: number, type: string) =>
  new File([new Uint8Array(size)], "lease-file", { type });

describe("document upload form validation", () => {
  it("requires a document file before submission", () => {
    const result = documentUploadSchema.safeParse({
      ...basePayload,
      file: undefined,
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.file).toContain(
      "Add a file before uploading.",
    );
  });

  it("rejects unsupported file types", () => {
    const result = documentUploadSchema.safeParse({
      ...basePayload,
      file: createFile(1024, "text/plain"),
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.file).toContain(
      "Please upload a PDF, Word, or image file.",
    );
  });

  it("rejects files larger than 10MB", () => {
    const result = documentUploadSchema.safeParse({
      ...basePayload,
      file: createFile(MAX_DOCUMENT_FILE_SIZE + 1, "application/pdf"),
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.file).toContain(
      "File size must be 10MB or less.",
    );
  });

  it("requires a short, plain-language title", () => {
    const result = documentUploadSchema.safeParse({
      ...basePayload,
      file: createFile(1024, "application/pdf"),
      title: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.title).toContain(
      "Give your document a title.",
    );
  });

  it("validates expiration dates", () => {
    const result = documentUploadSchema.safeParse({
      ...basePayload,
      file: createFile(1024, "application/pdf"),
      expires_at: "not-a-date",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.expires_at).toContain(
      "Enter a valid expiration date.",
    );
  });
});
