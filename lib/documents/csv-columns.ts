import { formatDate } from "@/lib/utils"
import { formatCurrency } from "@/lib/payments/currency"
import type { DocumentWithLease } from "@/types/documents"

const TYPE_LABELS: Record<string, string> = {
  lease: "Lease",
  addendum: "Addendum",
  insurance: "Insurance",
  maintenance: "Maintenance",
  other: "Other",
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_signature: "Pending Signature",
  signed: "Signed",
  expired: "Expired",
  cancelled: "Cancelled",
}

export const DOCUMENT_COLUMN_IDS = [
  "title",
  "document_type",
  "status",
  "created_at",
  "signature_progress",
  "tenant_count",
  "rent",
  "requires_signature",
  "expires_at",
] as const

export type DocumentColumnId = (typeof DOCUMENT_COLUMN_IDS)[number]

export interface DocumentCsvColumn {
  id: DocumentColumnId
  label: string
  getValue: (document: DocumentWithLease) => string
}

function resolveCurrency(document: DocumentWithLease): string {
  const metadataCurrency = typeof document.metadata?.currency === "string" ? document.metadata.currency : null
  if (metadataCurrency) {
    return metadataCurrency.toUpperCase()
  }
  if (document.lease && (document.lease as any).currency) {
    return String((document.lease as any).currency)
  }
  return "USD"
}

function formatRent(document: DocumentWithLease): string {
  const rentAmount = document.lease?.rent_amount
  if (rentAmount === null || rentAmount === undefined) {
    return "—"
  }

  const currency = resolveCurrency(document)
  const dollars = rentAmount / 100
  const formatted = formatCurrency(dollars, currency)
  const frequency = document.lease?.rent_frequency
  return frequency ? `${formatted} / ${frequency}` : formatted
}

function formatSignatureProgress(document: DocumentWithLease): string {
  const total = document.signatures?.length ?? 0
  if (total === 0) {
    return "No signatures"
  }

  const signed = document.signatures?.filter((signature) => signature?.status === "signed").length ?? 0
  return `${signed}/${total} signed`
}

function formatTenantCount(document: DocumentWithLease): string {
  const tenantIds = document.lease?.tenant_ids
  if (tenantIds && tenantIds.length > 0) {
    return `${tenantIds.length}`
  }

  const metadataTenants = Array.isArray(document.metadata?.tenant_ids)
    ? (document.metadata?.tenant_ids as unknown[])
    : null
  if (metadataTenants && metadataTenants.length > 0) {
    return `${metadataTenants.length}`
  }

  return "—"
}

export const DOCUMENT_CSV_COLUMNS: DocumentCsvColumn[] = [
  {
    id: "title",
    label: "Title",
    getValue: (document) => document.title,
  },
  {
    id: "document_type",
    label: "Type",
    getValue: (document) => TYPE_LABELS[document.document_type] ?? document.document_type,
  },
  {
    id: "status",
    label: "Status",
    getValue: (document) => STATUS_LABELS[document.status] ?? document.status,
  },
  {
    id: "created_at",
    label: "Created",
    getValue: (document) => formatDate(document.created_at),
  },
  {
    id: "signature_progress",
    label: "Signature progress",
    getValue: (document) => formatSignatureProgress(document),
  },
  {
    id: "tenant_count",
    label: "Tenants",
    getValue: (document) => formatTenantCount(document),
  },
  {
    id: "rent",
    label: "Rent",
    getValue: (document) => formatRent(document),
  },
  {
    id: "requires_signature",
    label: "Requires signature",
    getValue: (document) => (document.requires_signature ? "Yes" : "No"),
  },
  {
    id: "expires_at",
    label: "Expires",
    getValue: (document) => (document.expires_at ? formatDate(document.expires_at) : "—"),
  },
]

export const DOCUMENT_CSV_COLUMNS_MAP = new Map(
  DOCUMENT_CSV_COLUMNS.map((column) => [column.id, column] as const),
)
