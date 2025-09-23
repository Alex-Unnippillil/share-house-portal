import { formatDistanceToNow } from 'date-fns';

import type { DocumentStatus, DocumentWithLease } from '@/types/documents';

import type { CsvCell } from './csv';

export const DOCUMENT_CSV_HEADERS = [
  'Title',
  'Description',
  'Status',
  'Created',
  'Lease summary',
  'Signatures',
];

const statusLabels: Record<DocumentStatus, string> = {
  draft: 'Draft',
  pending_signature: 'Pending Signature',
  signed: 'Signed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

function formatCreatedAt(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return '';
  }
}

function formatLeaseSummary(document: DocumentWithLease): string {
  if (!document.lease) {
    return '';
  }

  const tenantCount = document.lease.tenant_ids?.length ?? 0;
  const tenantLabel = tenantCount === 1 ? 'tenant' : 'tenants';
  return `Lease • ${tenantCount} ${tenantLabel}`;
}

function formatSignatures(document: DocumentWithLease): string {
  const signatures = document.signatures ?? [];
  if (signatures.length === 0) {
    return '';
  }

  const signedCount = signatures.filter((signature) => signature.status === 'signed').length;
  return `${signedCount}/${signatures.length} signed`;
}

export function buildDocumentCsvRows(documents: DocumentWithLease[]): CsvCell[][] {
  return documents.map((document) => {
    const status = document.status as DocumentStatus;

    return [
      document.title,
      document.description ?? '',
      statusLabels[status] ?? status,
      formatCreatedAt(document.created_at),
      formatLeaseSummary(document),
      formatSignatures(document),
    ];
  });
}
