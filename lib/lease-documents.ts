import type { Database } from "@/lib/supabase";

export type LeaseRecord = Database["public"]["Tables"]["leases"]["Row"];
export type LeaseDocumentRecord = Database["public"]["Tables"]["lease_documents"]["Row"];
export type ResidentLeaseRecord = Database["public"]["Tables"]["resident_leases"]["Row"];
export type LeaseDocumentStatus = Database["public"]["Enums"]["lease_document_status"];

export const TERMINAL_LEASE_DOCUMENT_STATUSES: readonly LeaseDocumentStatus[] = [
  "completed",
  "declined",
  "cancelled",
];

const DOCUMENSO_STATUS_MAP: Record<string, LeaseDocumentStatus> = {
  completed: "completed",
  complete: "completed",
  signed: "completed",
  finished: "completed",
  done: "completed",
  declined: "declined",
  rejected: "declined",
  refused: "declined",
  cancelled: "cancelled",
  canceled: "cancelled",
  voided: "cancelled",
  draft: "draft",
  created: "draft",
  sent: "awaiting_signature",
  issued: "awaiting_signature",
  pending: "awaiting_signature",
  "awaiting_signature": "awaiting_signature",
  "waiting_for_signature": "awaiting_signature",
  "out_for_signature": "awaiting_signature",
};

export function mapDocumensoStatus(status: string | null | undefined): LeaseDocumentStatus {
  if (!status) {
    return "awaiting_signature";
  }

  const key = status.toString().trim().toLowerCase();
  return DOCUMENSO_STATUS_MAP[key] ?? "awaiting_signature";
}

export function isTerminalLeaseDocumentStatus(status: LeaseDocumentStatus): boolean {
  return TERMINAL_LEASE_DOCUMENT_STATUSES.includes(status);
}

export function canTransitionLeaseDocumentStatus(
  current: LeaseDocumentStatus,
  next: LeaseDocumentStatus,
): boolean {
  if (current === next) {
    return true;
  }

  if (current === "completed") {
    return false;
  }

  if (current === "awaiting_signature") {
    return next === "completed" || next === "declined" || next === "cancelled";
  }

  if (current === "draft") {
    return next === "awaiting_signature" || next === "cancelled";
  }

  if (current === "declined") {
    return next === "awaiting_signature" || next === "cancelled";
  }

  if (current === "cancelled") {
    return next === "awaiting_signature";
  }

  return false;
}

export function formatLeaseDocumentStatus(status: LeaseDocumentStatus): string {
  switch (status) {
    case "awaiting_signature":
      return "Awaiting signature";
    case "completed":
      return "Completed";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
    case "draft":
    default:
      return "Draft";
  }
}

export interface LeaseDocumentSummary {
  id: string;
  name: string;
  status: LeaseDocumentStatus;
  requestedAt: string | null;
  completedAt: string | null;
  signingEmbedUrl: string | null;
  documensoDownloadUrl: string | null;
  documensoDocumentId: string;
  documensoEnvelopeId: string | null;
  storagePath: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface LeaseAssignmentSummary {
  role: string;
  isPrimary: boolean;
  signedAt: string | null;
  documensoRecipientId: string | null;
}

export interface LeaseSummary {
  id: string;
  title: string;
  description: string | null;
  effectiveDate: string | null;
  terminationDate: string | null;
  updatedAt: string;
  documents: LeaseDocumentSummary[];
  assignment: LeaseAssignmentSummary | null;
}

type LeaseRowWithRelations = LeaseRecord & {
  lease_documents?: LeaseDocumentRecord[] | null;
  resident_leases?: ResidentLeaseRecord[] | null;
};

function sortLeaseDocuments(documents: LeaseDocumentSummary[]): LeaseDocumentSummary[] {
  return [...documents].sort((a, b) => {
    const aSort = new Date(a.requestedAt ?? a.createdAt).getTime();
    const bSort = new Date(b.requestedAt ?? b.createdAt).getTime();
    return bSort - aSort;
  });
}

export function buildLeaseSummaries(
  leases: LeaseRowWithRelations[] | null | undefined,
  residentId: string,
): LeaseSummary[] {
  if (!leases || leases.length === 0) {
    return [];
  }

  return leases.map((lease) => {
    const documents: LeaseDocumentSummary[] = (lease.lease_documents ?? []).map((doc) => ({
      id: doc.id,
      name: doc.name,
      status: doc.status,
      requestedAt: doc.requested_at,
      completedAt: doc.completed_at,
      signingEmbedUrl: doc.signing_embed_url,
      documensoDownloadUrl: doc.documenso_download_url,
      documensoDocumentId: doc.documenso_document_id,
      documensoEnvelopeId: doc.documenso_envelope_id,
      storagePath: doc.storage_path,
      lastSyncedAt: doc.last_synced_at,
      createdAt: doc.created_at,
    }));

    const assignmentRecord = (lease.resident_leases ?? []).find(
      (residentLease) => residentLease.resident_id === residentId,
    ) ?? null;

    const assignment: LeaseAssignmentSummary | null = assignmentRecord
      ? {
          role: assignmentRecord.role,
          isPrimary: assignmentRecord.is_primary,
          signedAt: assignmentRecord.signed_at,
          documensoRecipientId: assignmentRecord.documenso_recipient_id ?? null,
        }
      : null;

    return {
      id: lease.id,
      title: lease.title,
      description: lease.description,
      effectiveDate: lease.effective_date,
      terminationDate: lease.termination_date,
      updatedAt: lease.updated_at,
      documents: sortLeaseDocuments(documents),
      assignment,
    };
  });
}
