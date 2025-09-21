import { describe, expect, it, vi } from "vitest";
import { DocumensoClient } from "@/lib/documenso-client";

describe("DocumensoClient", () => {
  it("requests templates from the Documenso API", async () => {
    const templates = [
      {
        id: "tmpl-1",
        name: "Residential Lease",
        description: "Primary lease template",
        status: "active",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-02-01T00:00:00.000Z",
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => templates,
    });

    const client = new DocumensoClient({
      baseUrl: "https://doc.test",
      apiKey: "test-key",
      fetch: fetchMock,
    });

    const response = await client.listTemplates();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://doc.test/api/templates",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      }),
    );
    expect(response).toEqual(templates);
  });

  it("throws an error when Documenso returns an HTTP error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "server-error",
    });

    const client = new DocumensoClient({
      baseUrl: "https://doc.test",
      apiKey: "test-key",
      fetch: fetchMock,
    });

    await expect(client.listTemplates()).rejects.toThrow(
      /Documenso request failed/,
    );
  });
});
