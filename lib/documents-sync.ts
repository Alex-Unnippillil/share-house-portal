import type {
  DocumensoEnvelopeStatus,
  DocumensoSigner,
  LeaseStatusUpdate,
} from "./documenso-client";
import {
  deriveLeaseStatusFromEnvelope,
  normalizeEnvelopeStatus,
} from "./documenso-client";

export interface DocumensoWebhookEnvelope {
  id: string;
  status?: string | null;
  completed_at?: string | null;
  completedAt?: string | null;
  expires_at?: string | null;
  expiresAt?: string | null;
}

export interface DocumensoWebhookEvent {
  type: string;
  data: {
    envelope: DocumensoWebhookEnvelope;
    signers?: (DocumensoSigner & { status?: string | null })[];
  };
}

export interface LeaseSyncResult {
  envelopeId: string;
  leaseUpdate: LeaseStatusUpdate;
  signerUpdates: Array<{
    documenso_signer_id?: string | null;
    name: string;
    email: string;
    role?: string | null;
    status?: DocumensoEnvelopeStatus;
    signing_order?: number | null;
    signed_at?: string | null;
  }>;
}

export function extractEnvelopeTimestamps(envelope: DocumensoWebhookEnvelope) {
  return {
    completed_at: envelope.completed_at ?? envelope.completedAt ?? null,
    expires_at: envelope.expires_at ?? envelope.expiresAt ?? null,
  };
}

export function buildLeaseSyncResult(
  event: DocumensoWebhookEvent,
  currentStatus: DocumensoEnvelopeStatus | null,
): LeaseSyncResult {
  const envelope = event?.data?.envelope;
  if (!envelope?.id) {
    throw new Error("Webhook payload is missing an envelope id.");
  }

  const normalizedStatus = normalizeEnvelopeStatus(envelope.status);
  const timestamps = extractEnvelopeTimestamps(envelope);
  const leaseUpdate = deriveLeaseStatusFromEnvelope(currentStatus, {
    status: normalizedStatus,
    completed_at: timestamps.completed_at,
    expires_at: timestamps.expires_at,
  });

  const signerUpdates = (event.data.signers ?? []).map((signer) => ({
    documenso_signer_id: signer.id,
    email: signer.email,
    name: signer.name,
    role: signer.role,
    status: normalizeEnvelopeStatus(signer.status),
    signing_order: signer.signing_order ?? null,
    signed_at: signer.signed_at ?? null,
  }));

  return {
    envelopeId: envelope.id,
    leaseUpdate,
    signerUpdates,
  };
}
