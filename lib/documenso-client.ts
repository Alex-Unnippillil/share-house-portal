import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";

export type DocumensoTemplate = {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DocumensoSigner = {
  id?: string;
  name: string;
  email: string;
  role?: string;
  status?: DocumensoEnvelopeStatus;
  signing_order?: number | null;
  signed_at?: string | null;
};

export type DocumensoEnvelope = {
  id: string;
  name?: string | null;
  status?: DocumensoEnvelopeStatus;
  created_at?: string | null;
  updated_at?: string | null;
  expires_at?: string | null;
  completed_at?: string | null;
  signers?: DocumensoSigner[];
  metadata?: Record<string, unknown> | null;
};

export type DocumensoEnvelopeStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "completed"
  | "declined"
  | "expired"
  | "error";

export interface CreateEnvelopeFromTemplateInput {
  name: string;
  template_id: string;
  signers: DocumensoSigner[];
  metadata?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  expires_at?: string;
}

export interface DocumensoClientConfig {
  baseUrl?: string;
  apiKey?: string;
  fetch?: typeof fetch;
}

const statusPriority: Record<DocumensoEnvelopeStatus, number> = {
  draft: 0,
  sent: 1,
  viewed: 2,
  completed: 3,
  declined: 4,
  expired: 5,
  error: 6,
};

export function normalizeEnvelopeStatus(status?: string | null): DocumensoEnvelopeStatus {
  if (!status) return "draft";
  const normalized = status.toLowerCase();
  if (normalized in statusPriority) {
    return normalized as DocumensoEnvelopeStatus;
  }
  return "error";
}

export function shouldPromoteStatus(
  current: DocumensoEnvelopeStatus | null,
  incoming: DocumensoEnvelopeStatus,
): boolean {
  if (!current) return true;
  return statusPriority[incoming] >= statusPriority[current];
}

export class DocumensoClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: DocumensoClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? process.env.DOCUMENSO_BASE_URL ?? "";
    this.apiKey = config.apiKey ?? process.env.DOCUMENSO_API_KEY ?? "";
    this.fetchImpl = config.fetch ?? fetch;
  }

  get isConfigured(): boolean {
    return Boolean(this.baseUrl && this.apiKey);
  }

  private assertConfigured() {
    if (!this.isConfigured) {
      throw new Error("Documenso client is not configured. Set DOCUMENSO_BASE_URL and DOCUMENSO_API_KEY.");
    }
  }

  private buildUrl(path: string): string {
    const trimmedPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${trimmedPath}`;
  }

  private buildHeaders(extra?: HeadersInit): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  private async request<T>(
    path: string,
    init: RequestInit & { parseAs?: "json" | "arrayBuffer" } = {},
  ): Promise<T> {
    this.assertConfigured();

    const { parseAs = "json", headers, ...rest } = init;
    const response = await this.fetchImpl(this.buildUrl(path), {
      ...rest,
      headers: this.buildHeaders(headers),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Documenso request failed (${response.status}): ${text}`);
    }

    if (parseAs === "arrayBuffer") {
      return (await response.arrayBuffer()) as T;
    }

    return (await response.json()) as T;
  }

  async listTemplates(): Promise<DocumensoTemplate[]> {
    return this.request<DocumensoTemplate[]>("/api/templates");
  }

  async getTemplate(id: string): Promise<DocumensoTemplate> {
    return this.request<DocumensoTemplate>(`/api/templates/${id}`);
  }

  async createEnvelopeFromTemplate(
    templateId: string,
    payload: Omit<CreateEnvelopeFromTemplateInput, "template_id">,
    options: { send?: boolean } = {},
  ): Promise<DocumensoEnvelope> {
    const envelope = await this.request<DocumensoEnvelope>(
      `/api/templates/${templateId}/envelopes`,
      {
        method: "POST",
        body: JSON.stringify({ ...payload, template_id: templateId }),
      },
    );

    if (options.send && envelope?.id) {
      try {
        const sentEnvelope = await this.sendEnvelope(envelope.id);
        return sentEnvelope ?? envelope;
      } catch (error) {
        return envelope;
      }
    }

    return envelope;
  }

  async sendEnvelope(envelopeId: string): Promise<DocumensoEnvelope | null> {
    try {
      return await this.request<DocumensoEnvelope>(`/api/envelopes/${envelopeId}/send`, {
        method: "POST",
      });
    } catch (error) {
      return null;
    }
  }

  async getEnvelope(envelopeId: string): Promise<DocumensoEnvelope> {
    const envelope = await this.request<DocumensoEnvelope>(`/api/envelopes/${envelopeId}`);
    return {
      ...envelope,
      status: normalizeEnvelopeStatus(envelope.status),
    };
  }

  async listEnvelopeDocuments(envelopeId: string): Promise<{ id: string; name: string }[]> {
    return this.request<{ id: string; name: string }[]>(`/api/envelopes/${envelopeId}/documents`);
  }

  async downloadEnvelope(envelopeId: string): Promise<ArrayBuffer> {
    return this.request<ArrayBuffer>(`/api/envelopes/${envelopeId}/download`, {
      method: "GET",
      parseAs: "arrayBuffer",
    });
  }
}

export const documensoClient = new DocumensoClient();

export type LeaseStatusUpdate = {
  status?: DocumensoEnvelopeStatus;
  completed_at?: string | null;
  expires_at?: string | null;
};

export function deriveLeaseStatusFromEnvelope(
  current: DocumensoEnvelopeStatus | null,
  envelope: Pick<DocumensoEnvelope, "status" | "completed_at" | "expires_at">,
): LeaseStatusUpdate {
  const incomingStatus = normalizeEnvelopeStatus(envelope.status);

  const update: LeaseStatusUpdate = {};
  if (shouldPromoteStatus(current, incomingStatus)) {
    update.status = incomingStatus;
  }

  if (envelope.completed_at) {
    update.completed_at = envelope.completed_at;
  } else if (incomingStatus !== "completed" && shouldPromoteStatus(current, incomingStatus)) {
    update.completed_at = null;
  }

  if (envelope.expires_at) {
    update.expires_at = envelope.expires_at;
  }

  return update;
}

export async function fetchDocumentsWithLeases(
  client: TypedSupabaseClient,
  profileId?: string,
) {
  let query = client
    .from("documents")
    .select(
      "id,title,description,is_active,documenso_template_id,created_at,updated_at,lease_versions(id,status,version_number,documenso_envelope_id,completed_at,expires_at,tenant_profile_id)",
    )
    .order("title", { ascending: true });

  if (profileId) {
    query = query.eq("lease_versions.tenant_profile_id", profileId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data;
}
