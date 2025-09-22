import { delayedValue } from '@/lib/utils/delay'
import type { DocumentListFilters, DocumentStats, DocumentWithLease } from '@/types/documents'

const BASE_DOCUMENTS: DocumentWithLease[] = [
  {
    id: 'doc-lease-1',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    title: 'Lease agreement v2.pdf',
    description: 'Primary lease for 2024 season',
    document_type: 'lease',
    status: 'signed',
    metadata: {},
    requires_signature: true,
    version: 2,
    signed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    signatures: [
      {
        id: 'sig-1',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        document_id: 'doc-lease-1',
        signer_id: 'tenant-1',
        signer_email: 'jordan@example.com',
        signer_name: 'Jordan Shaw',
        status: 'signed',
        signed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      },
      {
        id: 'sig-2',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
        document_id: 'doc-lease-1',
        signer_id: 'tenant-2',
        signer_email: 'avery@example.com',
        signer_name: 'Avery Patel',
        status: 'signed',
        signed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
      },
    ],
    lease: {
      id: 'lease-1',
      document_id: 'doc-lease-1',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
      end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 270).toISOString(),
      rent_amount: 2520,
      rent_frequency: 'monthly',
      tenant_ids: ['tenant-1', 'tenant-2'],
      property_address: '123 Shared House Ave',
      unit_number: 'Unit A',
      landlord_name: 'Elm Street Properties',
      landlord_email: 'leasing@elmstreet.co',
      auto_renew: true,
      renewal_notice_days: 60,
      status: 'signed',
      security_deposit: 500,
      special_terms: 'Roof deck hours end at 10pm',
    },
  },
  {
    id: 'doc-house-rules',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    title: 'House rules.pdf',
    description: 'Updated quiet hours and chores',
    document_type: 'addendum',
    status: 'pending_signature',
    metadata: {},
    requires_signature: true,
    version: 1,
    signatures: [
      {
        id: 'sig-3',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        document_id: 'doc-house-rules',
        signer_id: 'tenant-3',
        signer_email: 'kai@example.com',
        signer_name: 'Kai Hill',
        status: 'pending',
      },
    ],
  },
  {
    id: 'doc-insurance',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    title: 'Renters insurance.pdf',
    description: 'Policy confirmation from Jordan',
    document_type: 'insurance',
    status: 'expired',
    metadata: {},
    requires_signature: false,
    version: 1,
  },
]

export async function fetchDocumentStats(): Promise<DocumentStats> {
  const documents = await delayedValue(BASE_DOCUMENTS, 120)

  return {
    total_documents: documents.length,
    pending_signatures: documents.filter((doc) => doc.status === 'pending_signature').length,
    signed_documents: documents.filter((doc) => doc.status === 'signed').length,
    expired_documents: documents.filter((doc) => doc.status === 'expired').length,
    draft_documents: documents.filter((doc) => doc.status === 'draft').length,
  }
}

export async function fetchDocuments(filters: DocumentListFilters = {}): Promise<DocumentWithLease[]> {
  const documents = await delayedValue(BASE_DOCUMENTS, 260)

  return documents.filter((document) => {
    if (filters.status && filters.status.length > 0 && !filters.status.includes(document.status)) {
      return false
    }

    if (filters.type && filters.type.length > 0 && !filters.type.includes(document.document_type)) {
      return false
    }

    return true
  })
}
