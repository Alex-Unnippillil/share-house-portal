import type { LeaseDocumentStatus } from "@/lib/lease-documents";
import {
  mapDocumensoStatus,
} from "@/lib/lease-documents";

export class DocumensoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumensoConfigError";
  }
}

interface DocumensoConfig {
  baseUrl: string;
  apiKey: string;
}

const DOCUMENSO_DEFAULT_TIMEOUT = 30_000;

function resolveConfig(): DocumensoConfig {
  const baseUrl =
    process.env.DOCUMENSO_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_DOCUMENSO_API_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.DOCUMENSO_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new DocumensoConfigError(
      "Documenso environment variables are not configured. Set DOCUMENSO_API_BASE_URL and DOCUMENSO_API_KEY to use Documenso integrations.",
    );
  }

  return { baseUrl, apiKey };
}

async function documensoRequest<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { baseUrl, apiKey } = resolveConfig();
  const timeout = init?.timeoutMs ?? DOCUMENSO_DEFAULT_TIMEOUT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await safeParseJson(response);
      throw new Error(
        `Documenso request failed with status ${response.status}: ${JSON.stringify(errorBody)}`,
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch (error) {
    return { error: "Failed to parse Documenso response body" };
  }
}

export interface DocumensoDocumentDetails {
  id: string;
  status: string;
  envelopeId: string | null;
  downloadUrl: string | null;
  embedUrl: string | null;
  completedAt: string | null;
}

export interface DocumensoSignatureRequestPayload {
  recipientId?: string | null;
  email?: string | null;
  name?: string | null;
  redirectUrl?: string | null;
}

export interface DocumensoSignatureRequestResult {
  documentId: string;
  envelopeId: string | null;
  signingUrl: string | null;
}

export async function fetchDocumensoDocument(
  documentId: string,
): Promise<DocumensoDocumentDetails> {
  const data = await documensoRequest<Record<string, unknown>>(`/api/v1/documents/${documentId}`);

  return {
    id: String(data.id ?? documentId),
    status: String(data.status ?? data.state ?? "awaiting_signature"),
    envelopeId: coerceNullableString(data.envelopeId ?? data.envelope_id),
    downloadUrl: coerceNullableString(data.downloadUrl ?? data.download_url),
    embedUrl: coerceNullableString(data.embedUrl ?? data.embed_url ?? data.signing_url),
    completedAt: coerceNullableString(data.completedAt ?? data.completed_at),
  };
}

export async function createDocumensoSignatureRequest(
  documentId: string,
  payload: DocumensoSignatureRequestPayload,
): Promise<DocumensoSignatureRequestResult> {
  const body: Record<string, unknown> = {
    recipient_id: payload.recipientId ?? undefined,
    signer: {
      email: payload.email ?? undefined,
      name: payload.name ?? undefined,
    },
    redirect_url: payload.redirectUrl ?? undefined,
  };

  const data = await documensoRequest<Record<string, unknown>>(
    `/api/v1/documents/${documentId}/signing-links`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  return {
    documentId: String(data.documentId ?? data.document_id ?? documentId),
    envelopeId: coerceNullableString(data.envelopeId ?? data.envelope_id),
    signingUrl: coerceNullableString(data.signingUrl ?? data.signing_url ?? data.embed_url ?? data.url),
  };
}

export interface NormalizedDocumensoWebhook {
  documentId: string;
  envelopeId: string | null;
  status: LeaseDocumentStatus;
  completedAt: string | null;
  downloadUrl: string | null;
  signingUrl: string | null;
  recipientId: string | null;
}

export function normalizeDocumensoWebhookPayload(
  payload: unknown,
): NormalizedDocumensoWebhook | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, any>;
  const document =
    candidate.document ??
    candidate.data?.document ??
    (candidate.data && typeof candidate.data === "object" && "id" in candidate.data
      ? candidate.data
      : null);

  const documentId = coerceNullableString(document?.id ?? candidate.documentId ?? candidate.document_id);
  if (!documentId) {
    return null;
  }

  const rawStatus =
    document?.status ??
    candidate.status ??
    candidate.state ??
    candidate.event ??
    candidate.type ??
    null;

  const envelopeId = coerceNullableString(
    document?.envelope_id ?? document?.envelopeId ?? candidate.envelope_id ?? candidate.envelopeId,
  );

  const completedAt = coerceNullableString(
    document?.completed_at ?? document?.completedAt ?? candidate.completed_at ?? candidate.completedAt,
  );

  const downloadUrl = coerceNullableString(
    document?.download_url ?? document?.downloadUrl ?? candidate.download_url ?? candidate.downloadUrl,
  );

  const signingUrl = coerceNullableString(
    document?.embed_url ??
      document?.embedUrl ??
      document?.signing_url ??
      candidate.signing_url ??
      candidate.signingUrl ??
      candidate.embed_url ??
      candidate.embedUrl,
  );

  const recipientSource =
    candidate.recipient ??
    candidate.signer ??
    candidate.data?.recipient ??
    document?.recipient ??
    document?.signer ??
    null;

  const recipientId = coerceNullableString(
    recipientSource?.id ??
      recipientSource?.recipient_id ??
      recipientSource?.recipientId ??
      candidate.recipient_id ??
      candidate.recipientId,
  );

  return {
    documentId,
    envelopeId,
    status: mapDocumensoStatus(rawStatus),
    completedAt,
    downloadUrl,
    signingUrl,
    recipientId,
  };
}

function coerceNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}
