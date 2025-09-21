"use server";

import "server-only";

export type DocumensoEnvelopeStatus =
  | "draft"
  | "ready"
  | "sent"
  | "viewed"
  | "completed"
  | "declined"
  | "expired"
  | "cancelled";

export interface DocumensoTemplate {
  id: string;
  name: string;
  description?: string | null;
  updatedAt?: string | null;
}

export interface DocumensoRecipient {
  id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
  status?: string | null;
  signingUrl?: string | null;
}

export interface DocumensoEnvelope {
  id: string;
  status: DocumensoEnvelopeStatus;
  templateId?: string | null;
  redirectUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  completedAt?: string | null;
  expiresAt?: string | null;
  recipients?: DocumensoRecipient[];
  raw?: unknown;
}

export interface CreateEnvelopeFromTemplateInput {
  templateId: string;
  recipients: Array<{
    name: string;
    email: string;
    role?: string;
    signingOrder?: number;
  }>;
  metadata?: Record<string, unknown>;
  redirectUrl?: string;
}

export interface DocumensoDownload {
  data: ArrayBuffer;
  filename: string;
  contentType: string;
}

export class DocumensoError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "DocumensoError";
    this.status = status;
    this.details = details;
  }
}

function getBaseUrl() {
  const baseUrl = process.env.DOCUMENSO_BASE_URL;
  if (!baseUrl) {
    throw new DocumensoError(
      "DOCUMENSO_BASE_URL is not configured. Add it to your environment variables to enable document workflows.",
      500,
    );
  }

  return baseUrl.replace(/\/$/, "");
}

function getApiKey() {
  const apiKey = process.env.DOCUMENSO_API_KEY;
  if (!apiKey) {
    throw new DocumensoError(
      "DOCUMENSO_API_KEY is not configured. Generate an API key in Documenso and expose it via the environment.",
      500,
    );
  }

  return apiKey;
}

async function documensoRequest(path: string, init: RequestInit = {}) {
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: HeadersInit = {
    Accept: init.headers ? undefined : "application/json",
    Authorization: `Bearer ${getApiKey()}`,
    ...init.headers,
  };

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    let details: unknown = undefined;

    if (contentType?.includes("application/json")) {
      try {
        details = await response.json();
      } catch (error) {
        details = await response.text();
      }
    } else {
      details = await response.text();
    }

    throw new DocumensoError(
      `Documenso request failed with status ${response.status}`,
      response.status,
      details,
    );
  }

  return response;
}

async function documensoJson<T>(path: string, init: RequestInit = {}) {
  const response = await documensoRequest(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });

  return (await response.json()) as T;
}

function normaliseRecipient(payload: any): DocumensoRecipient {
  const candidate = payload?.member ?? payload;
  const email =
    typeof candidate?.email === "string"
      ? candidate.email.toLowerCase()
      : typeof payload?.email === "string"
        ? payload.email.toLowerCase()
        : null;

  const signingUrl =
    payload?.signing_url ??
    payload?.signingUrl ??
    payload?.links?.signing ??
    payload?.links?.sign ??
    payload?.member?.signing_url ??
    payload?.member?.signingUrl ??
    payload?.embedded_signing_url ??
    payload?.embeddedSigningUrl ??
    null;

  return {
    id: candidate?.id ?? payload?.id ?? null,
    name: candidate?.name ?? payload?.name ?? null,
    email,
    role: candidate?.role ?? payload?.role ?? payload?.role_name ?? null,
    status: (payload?.status ?? candidate?.status ?? payload?.state ?? null) ?? null,
    signingUrl,
  };
}

function normaliseEnvelope(payload: any): DocumensoEnvelope {
  const recipientsSource =
    payload?.recipients ?? payload?.members ?? payload?.roles ?? payload?.signers ?? [];
  const recipients = Array.isArray(recipientsSource)
    ? recipientsSource.map(normaliseRecipient)
    : undefined;

  const status = String(payload?.status ?? payload?.state ?? "draft").toLowerCase();

  return {
    id: String(payload?.id ?? payload?.envelope_id ?? payload?.uuid ?? ""),
    status: status as DocumensoEnvelopeStatus,
    templateId: payload?.template_id ?? payload?.templateId ?? null,
    redirectUrl: payload?.redirect_url ?? payload?.redirectUrl ?? null,
    metadata: (payload?.metadata ?? null) as Record<string, unknown> | null,
    completedAt: payload?.completed_at ?? payload?.completedAt ?? null,
    expiresAt: payload?.expires_at ?? payload?.expiresAt ?? null,
    recipients,
    raw: payload,
  };
}

function normaliseTemplate(payload: any): DocumensoTemplate {
  return {
    id: String(payload?.id ?? payload?.uuid ?? ""),
    name: payload?.name ?? payload?.title ?? "",
    description: payload?.description ?? null,
    updatedAt: payload?.updated_at ?? payload?.updatedAt ?? null,
  };
}

export async function listDocumensoTemplates() {
  const data = await documensoJson<any[]>("/api/v1/templates");
  return data.map(normaliseTemplate);
}

export async function getDocumensoEnvelope(envelopeId: string) {
  const data = await documensoJson<any>(`/api/v1/envelopes/${encodeURIComponent(envelopeId)}`);
  return normaliseEnvelope(data);
}

export async function createEnvelopeFromTemplate(input: CreateEnvelopeFromTemplateInput) {
  const payload = {
    template_id: input.templateId,
    recipients: input.recipients.map((recipient, index) => ({
      name: recipient.name,
      email: recipient.email,
      role: recipient.role ?? "signer",
      signing_order: recipient.signingOrder ?? index + 1,
    })),
    metadata: input.metadata ?? {},
    redirect_url: input.redirectUrl,
  };

  const data = await documensoJson<any>("/api/v1/envelopes/from-template", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return normaliseEnvelope(data);
}

export async function downloadEnvelopeDocument(envelopeId: string): Promise<DocumensoDownload> {
  const response = await documensoRequest(
    `/api/v1/envelopes/${encodeURIComponent(envelopeId)}/documents`,
    {
      headers: {
        Accept: "application/pdf",
      },
    },
  );

  const contentType = response.headers.get("content-type") ?? "application/pdf";
  const contentDisposition = response.headers.get("content-disposition");
  const fallbackName = `envelope-${envelopeId}.pdf`;
  const filename = extractFilename(contentDisposition) ?? fallbackName;
  const data = await response.arrayBuffer();

  return {
    contentType,
    filename,
    data,
  };
}

function extractFilename(header: string | null) {
  if (!header) return null;

  const filenameMatch = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (filenameMatch?.[1]) {
    return decodeURIComponent(filenameMatch[1]);
  }

  const quotedMatch = /filename="?([^";]+)"?/i.exec(header);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  return null;
}
