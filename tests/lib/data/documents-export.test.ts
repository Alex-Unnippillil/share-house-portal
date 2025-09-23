import { describe, expect, it, vi } from 'vitest'

import { exportDocumentsToCsv } from '@/lib/data/documents'
import type { DocumentListFilters } from '@/types/documents'
import type { DocumentWithLease } from '@/types/documents'

type QueryResult<T> = { data: T; error: { message: string } | null }

type QueryBuilder<T> = {
  select: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  or: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  gte: ReturnType<typeof vi.fn>
  lte: ReturnType<typeof vi.fn>
  then: (onFulfilled: (value: QueryResult<T>) => unknown) => Promise<unknown>
}

function createDocumentsQuery<T extends unknown[]>(result: QueryResult<T>) {
  const builder: Partial<QueryBuilder<T>> & {
    select: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    or: ReturnType<typeof vi.fn>
    in: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    gte: ReturnType<typeof vi.fn>
    lte: ReturnType<typeof vi.fn>
  } = {
    select: vi.fn().mockImplementation(() => builder),
    order: vi.fn().mockImplementation(() => builder),
    or: vi.fn().mockImplementation(() => builder),
    in: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation(() => builder),
    gte: vi.fn().mockImplementation(() => builder),
    lte: vi.fn().mockImplementation(() => builder),
  }

  ;(builder as QueryBuilder<T>).then = (onFulfilled) =>
    Promise.resolve(onFulfilled(result))

  return builder as QueryBuilder<T>
}

function createSupabaseStub<T extends unknown[]>(query: QueryBuilder<T>) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe('documents')
      return query
    }),
  }
}

const baseDocument: DocumentWithLease = {
  id: 'doc-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  title: 'Lease Agreement',
  description: 'Primary lease for unit 501',
  document_type: 'lease',
  status: 'signed',
  state: 'published',
  file_url: null,
  documenso_envelope_id: null,
  documenso_template_id: null,
  created_by: 'manager-1',
  tenant_id: 'tenant-1',
  unit_id: 'unit-501',
  requires_signature: true,
  expires_at: '2025-01-01T00:00:00Z',
  signed_at: '2024-01-05T00:00:00Z',
  version: 1,
  parent_document_id: null,
  published_at: '2024-01-02T00:00:00Z',
  lease: {
    id: 'lease-1',
    document_id: 'doc-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    rent_amount: 250000,
    rent_frequency: 'monthly',
    security_deposit: 50000,
    tenant_ids: ['tenant-1', 'tenant-2'],
    property_address: '123 Main St',
    unit_number: '501',
    landlord_name: 'Property Manager',
    landlord_email: 'pm@example.com',
    auto_renew: false,
    renewal_notice_days: 60,
    special_terms: null,
    status: 'active',
  },
  signatures: [
    {
      id: 'sig-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      document_id: 'doc-1',
      signer_id: 'tenant-1',
      signer_email: 'tenant1@example.com',
      signer_name: 'Tenant One',
      status: 'signed',
      signed_at: '2024-01-03T00:00:00Z',
      declined_at: null,
      decline_reason: null,
      documenso_signature_id: null,
      ip_address: null,
      user_agent: null,
      signature_data: null,
      signing_order: 1,
    },
    {
      id: 'sig-2',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
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
      signature_data: null,
      signing_order: 2,
    },
  ],
  access_logs: [],
  versions: [],
}

describe('exportDocumentsToCsv', () => {
  it('honors filters and column visibility when generating CSV', async () => {
    const query = createDocumentsQuery({
      data: [baseDocument] as DocumentWithLease[],
      error: null,
    })
    const supabase = createSupabaseStub(query)

    const filters: DocumentListFilters = { status: ['signed'], type: ['lease'] }

    const { csv, documents } = await exportDocumentsToCsv({
      client: supabase,
      userId: 'tenant-1',
      role: 'tenant',
      filters,
      sort: { column: 'title', direction: 'asc' },
      visibleColumns: ['title', 'status', 'rent'],
    })

    expect(query.in).toHaveBeenCalledWith('status', filters.status)
    expect(query.in).toHaveBeenCalledWith('document_type', filters.type)
    expect(query.order).toHaveBeenNthCalledWith(
      1,
      'title',
      expect.objectContaining({ ascending: true }),
    )
    expect(csv.split('\n')[0]).toBe('Title,Status,Rent')
    expect(csv.split('\n')[1]).toContain('Lease Agreement')
    expect(csv.split('\n')[1]).toContain('$2,500.00 / monthly')
    expect(documents).toHaveLength(1)
  })
})
