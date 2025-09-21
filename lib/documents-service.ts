import { type Database, type Json } from "./supabase";
import type {
  DocumensoEnvelope,
  DocumensoEnvelopeStatus,
  DocumensoRecipient,
} from "./documenso-client";

export type DocumentStatus = Database["public"]["Enums"]["document_status"];

export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type LeaseVersionRow = Database["public"]["Tables"]["lease_versions"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type DocumentWithRelations = DocumentRow & {
  lease_versions?: LeaseVersionRow[] | null;
  tenant?: Pick<ProfileRow, "id" | "email" | "full_name"> | null;
};

export type SignerMetadata = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  signingUrl?: string | null;
};

export const MANAGER_ROLES = new Set(["property_manager", "admin"]);

export function isManagerRole(role?: string | null) {
  return role ? MANAGER_ROLES.has(role) : false;
}

export function filterDocumentsForViewer<T extends DocumentWithRelations>(
  documents: T[],
  viewerId: string,
  viewerRole?: string | null,
) {
  if (isManagerRole(viewerRole)) {
    return documents;
  }

  return documents.filter((document) => document.tenant_id === viewerId);
}

export function getLeaseVersions(document: DocumentWithRelations) {
  return [...(document.lease_versions ?? [])].sort((a, b) => {
    if (a.version !== b.version) {
      return b.version - a.version;
    }

    const aDate = a.updated_at ?? a.created_at ?? "";
    const bDate = b.updated_at ?? b.created_at ?? "";

    return bDate.localeCompare(aDate);
  });
}

export function getLatestLeaseVersion(document: DocumentWithRelations) {
  return getLeaseVersions(document)[0];
}

export function getActiveLeaseVersion(document: DocumentWithRelations) {
  const versions = getLeaseVersions(document);

  if (document.active_envelope_id) {
    const match = versions.find(
      (version) => version.documenso_envelope_id === document.active_envelope_id,
    );

    if (match) {
      return match;
    }
  }

  return versions[0];
}

export function getLatestCompletedLeaseVersion(document: DocumentWithRelations) {
  return getLeaseVersions(document).find((version) => version.status === "completed");
}

export function resolveDocumentStatus(document: DocumentWithRelations): DocumentStatus {
  const versions = getLeaseVersions(document);
  if (versions.length === 0) {
    return document.status;
  }

  const active = getActiveLeaseVersion(document);
  if (active?.status) {
    return active.status;
  }

  return document.status;
}

export function isTerminalStatus(status: DocumentStatus) {
  return ["completed", "declined", "expired", "cancelled"].includes(status);
}

export function isActiveStatus(status: DocumentStatus) {
  return status === "sent" || status === "viewed";
}

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  completed: "Completed",
  declined: "Declined",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const STATUS_VARIANTS: Record<DocumentStatus, "default" | "secondary" | "destructive" | "complete" | "outline"> = {
  draft: "secondary",
  sent: "default",
  viewed: "default",
  completed: "complete",
  declined: "destructive",
  expired: "outline",
  cancelled: "outline",
};

export function getStatusLabel(status: DocumentStatus) {
  return STATUS_LABELS[status] ?? status;
}

export function getStatusVariant(status: DocumentStatus) {
  return STATUS_VARIANTS[status] ?? "default";
}

export function parseSigners(signers: LeaseVersionRow["signers"]): SignerMetadata[] {
  if (!signers) return [];

  if (Array.isArray(signers)) {
    return signers as SignerMetadata[];
  }

  if (typeof signers === "object") {
    return Object.values(signers).filter((value) => typeof value === "object") as SignerMetadata[];
  }

  return [];
}

export function mapRecipientsToSigners(recipients: DocumensoRecipient[] = []) {
  return recipients.map<SignerMetadata>((recipient) => ({
    name: recipient.name,
    email: recipient.email,
    role: recipient.role,
    status: recipient.status ?? undefined,
    signingUrl: recipient.signingUrl ?? undefined,
  }));
}

export function mapDocumensoStatusToDocumentStatus(status?: string | null): DocumentStatus {
  const value = (status ?? "draft").toString().toLowerCase() as DocumensoEnvelopeStatus | string;

  switch (value) {
    case "completed":
      return "completed";
    case "declined":
      return "declined";
    case "expired":
      return "expired";
    case "cancelled":
      return "cancelled";
    case "viewed":
      return "viewed";
    case "sent":
    case "ready":
    case "in_progress":
      return "sent";
    default:
      return "draft";
  }
}

export function shouldAllowNewEnvelope(document: DocumentWithRelations) {
  if (!document.active_envelope_id) {
    return true;
  }

  return isTerminalStatus(document.status);
}

export function getNextLeaseVersionNumber(document: DocumentWithRelations) {
  const versions = getLeaseVersions(document);
  if (versions.length === 0) {
    return 1;
  }

  const highest = versions[0]?.version ?? 0;
  return highest + 1;
}

export function coerceMetadata(metadata: DocumentRow["metadata"]) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return { ...metadata } as Record<string, unknown>;
  }

  return {} as Record<string, unknown>;
}

export function extractSigningUrlForRecipient(
  envelope: DocumensoEnvelope,
  email: string,
) {
  const target = email.toLowerCase();
  const recipients = envelope.recipients ?? [];

  for (const recipient of recipients) {
    if ((recipient.email ?? "").toLowerCase() === target && recipient.signingUrl) {
      return recipient.signingUrl;
    }
  }

  return null;
}

export function leaseVersionToUpdatePayload(
  envelope: DocumensoEnvelope,
  previous: LeaseVersionRow,
) {
  const status = mapDocumensoStatusToDocumentStatus(envelope.status);

  return {
    status,
    signers: mapRecipientsToSigners(envelope.recipients ?? []) as Json,
    completed_at:
      status === "completed"
        ? envelope.completedAt ?? previous.completed_at ?? new Date().toISOString()
        : previous.completed_at,
    expires_at: envelope.expiresAt ?? previous.expires_at,
    sent_at:
      status === "draft"
        ? previous.sent_at
        : previous.sent_at ?? new Date().toISOString(),
  } satisfies Partial<LeaseVersionRow>;
}

export function documentStatusFromEnvelope(
  envelope: DocumensoEnvelope,
  previous: DocumentWithRelations,
) {
  const status = mapDocumensoStatusToDocumentStatus(envelope.status);

  return {
    status,
    active_envelope_id: isTerminalStatus(status)
      ? null
      : previous.active_envelope_id ?? envelope.id,
  } satisfies Partial<DocumentRow>;
}
