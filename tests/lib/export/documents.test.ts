import { describe, expect, it, vi } from 'vitest';

import { DOCUMENT_CSV_HEADERS, buildDocumentCsvRows } from '@/lib/export/documents';
import { buildCsvString } from '@/lib/export/csv';
import type { DocumentWithLease } from '@/types/documents';

function createDocument(partial: Partial<DocumentWithLease>): DocumentWithLease {
  return {
    id: 'doc-id',
    created_at: '2024-06-08T12:00:00Z',
    updated_at: '2024-06-08T12:00:00Z',
    title: 'Untitled',
    description: undefined,
    document_type: 'lease',
    status: 'draft',
    file_url: undefined,
    documenso_envelope_id: undefined,
    documenso_template_id: undefined,
    metadata: {},
    created_by: undefined,
    property_id: undefined,
    tenant_id: undefined,
    unit_id: undefined,
    requires_signature: false,
    expires_at: undefined,
    signed_at: undefined,
    version: 1,
    parent_document_id: undefined,
    lease: undefined,
    signatures: undefined,
    access_logs: undefined,
    ...partial,
  };
}

describe('buildDocumentCsvRows', () => {
  it('creates rows matching the visible document columns', () => {
    vi.setSystemTime(new Date('2024-06-10T12:00:00Z'));

    const documents: DocumentWithLease[] = [
      createDocument({
        id: 'doc-1',
        title: 'Lease Agreement',
        description: 'Main unit lease',
        status: 'pending_signature',
        created_at: '2024-06-08T12:00:00Z',
        lease: {
          id: 'lease-1',
          document_id: 'doc-1',
          created_at: '2024-06-01T12:00:00Z',
          updated_at: '2024-06-01T12:00:00Z',
          start_date: '2024-06-01',
          end_date: '2025-05-31',
          rent_amount: 2500,
          rent_frequency: 'monthly',
          security_deposit: null,
          tenant_ids: ['tenant-1', 'tenant-2'],
          property_address: null,
          unit_number: null,
          landlord_name: null,
          landlord_email: null,
          auto_renew: true,
          renewal_notice_days: 45,
          special_terms: null,
          status: 'pending_signature',
        },
        signatures: [
          {
            id: 'sig-1',
            created_at: '2024-06-08T12:00:00Z',
            updated_at: '2024-06-08T12:00:00Z',
            document_id: 'doc-1',
            signer_id: 'tenant-1',
            signer_email: 'tenant1@example.com',
            signer_name: 'Tenant One',
            status: 'signed',
            signed_at: '2024-06-08T12:30:00Z',
            declined_at: null,
            decline_reason: null,
            documenso_signature_id: null,
            ip_address: null,
            user_agent: null,
            signature_data: {},
          },
          {
            id: 'sig-2',
            created_at: '2024-06-08T12:00:00Z',
            updated_at: '2024-06-08T12:00:00Z',
            document_id: 'doc-1',
            signer_id: 'tenant-2',
            signer_email: 'tenant2@example.com',
            signer_name: 'Tenant Two',
            status: 'pending',
            signed_at: null,
            declined_at: null,
            decline_reason: null,
            documenso_signature_id: null,
            ip_address: null,
            user_agent: null,
            signature_data: {},
          },
        ],
      }),
      createDocument({
        id: 'doc-2',
        title: 'Insurance certificate',
        status: 'signed',
        created_at: '2024-05-20T09:00:00Z',
        signatures: [],
      }),
    ];

    const rows = buildDocumentCsvRows(documents);
    const csv = buildCsvString(DOCUMENT_CSV_HEADERS, rows);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual([
      'Lease Agreement',
      'Main unit lease',
      'Pending Signature',
      '2 days ago',
      'Lease • 2 tenants',
      '1/2 signed',
    ]);
    expect(rows[1]).toEqual([
      'Insurance certificate',
      '',
      'Signed',
      '21 days ago',
      '',
      '',
    ]);

    expect(csv.split('\n')[0]).toBe(
      '"Title","Description","Status","Created","Lease summary","Signatures"'
    );

    vi.useRealTimers();
  });
});
