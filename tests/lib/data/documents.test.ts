import { describe, expect, it, vi } from 'vitest';
import { fetchDocumentStats, fetchDocumentsList } from '@/lib/data/documents';
import type { DocumentListFilters } from '@/types/documents';

type QueryResult<T> = { data: T; error: { message: string } | null };

type QueryBuilder<T> = {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  then: (onFulfilled: (value: QueryResult<T>) => unknown) => Promise<unknown>;
};

function createQueryBuilder<T extends unknown[]>(result: QueryResult<T>) {
  const builder: Partial<QueryBuilder<T>> & {
    select: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
  } = {
    select: vi.fn().mockImplementation(() => builder),
    order: vi.fn().mockImplementation(() => builder),
    in: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation(() => builder),
    gte: vi.fn().mockImplementation(() => builder),
    lte: vi.fn().mockImplementation(() => builder),
  };

  (builder as QueryBuilder<T>).then = (onFulfilled) =>
    Promise.resolve(onFulfilled(result));

  return builder as QueryBuilder<T>;
}

function createSupabaseStub(options: {
  documentsResult: QueryResult<unknown[]>;
  tenantDocumentsResult: QueryResult<unknown[]>;
  signatureDocumentsResult: QueryResult<unknown[]>;
}) {
  const documentsQuery = createQueryBuilder(options.documentsResult);
  const tenantDocumentsQuery = createQueryBuilder(options.tenantDocumentsResult);
  const signatureDocumentsQuery = createQueryBuilder(options.signatureDocumentsResult);

  let documentCallCount = 0;

  const from = vi.fn((table: string) => {
    if (table === 'documents') {
      documentCallCount += 1;
      return documentCallCount === 1 ? documentsQuery : tenantDocumentsQuery;
    }

    if (table === 'document_signatures') {
      return signatureDocumentsQuery;
    }

    throw new Error(`Unexpected table queried: ${table}`);
  });

  return {
    from,
    queries: {
      documentsQuery,
      tenantDocumentsQuery,
      signatureDocumentsQuery,
    },
  };
}

describe('fetchDocumentsList', () => {
  it('applies role scoping and filters for non privileged members', async () => {
    const supabase = createSupabaseStub({
      documentsResult: { data: [{ id: 'doc-1' }] as any, error: null },
      tenantDocumentsResult: { data: [{ id: 'doc-1' }] as any, error: null },
      signatureDocumentsResult: { data: [{ document_id: 'doc-2' }] as any, error: null },
    });

    const filters: DocumentListFilters = {
      status: ['draft', 'signed'],
      type: ['lease'],
      tenant_id: 'tenant-123',
      unit_id: 'unit-456',
      date_from: '2024-01-01',
      date_to: '2024-12-31',
    };

    const documents = await fetchDocumentsList({
      client: supabase as any,
      userId: 'user-123',
      role: 'tenant',
      filters,
    });

    expect(documents).toEqual([{ id: 'doc-1', versions: [] }]);
    const { documentsQuery, tenantDocumentsQuery, signatureDocumentsQuery } = supabase.queries;
    expect(tenantDocumentsQuery.select).toHaveBeenCalledWith('id');
    expect(tenantDocumentsQuery.eq).toHaveBeenCalledWith('tenant_id', 'user-123');
    expect(signatureDocumentsQuery.select).toHaveBeenCalledWith('document_id');
    expect(signatureDocumentsQuery.eq).toHaveBeenCalledWith('signer_id', 'user-123');
    expect(documentsQuery.in).toHaveBeenCalledWith(
      'id',
      expect.arrayContaining(['doc-1', 'doc-2'])
    );
    const idFilterCall = documentsQuery.in.mock.calls.find(([column]) => column === 'id');
    expect(idFilterCall?.[1]).toHaveLength(2);
    expect(documentsQuery.in).toHaveBeenCalledWith('status', filters.status);
    expect(documentsQuery.in).toHaveBeenCalledWith('document_type', filters.type);
    expect(documentsQuery.eq).toHaveBeenCalledWith('tenant_id', filters.tenant_id);
    expect(documentsQuery.eq).toHaveBeenCalledWith('unit_id', filters.unit_id);
    expect(documentsQuery.gte).toHaveBeenCalledWith('created_at', filters.date_from);
    expect(documentsQuery.lte).toHaveBeenCalledWith('created_at', filters.date_to);
  });

  it('skips scoping for property managers and admins', async () => {
    const supabase = createSupabaseStub({
      documentsResult: { data: [], error: null },
      tenantDocumentsResult: { data: [], error: null },
      signatureDocumentsResult: { data: [], error: null },
    });

    await fetchDocumentsList({
      client: supabase as any,
      userId: 'manager-1',
      role: 'property_manager',
    });

    const { documentsQuery, tenantDocumentsQuery, signatureDocumentsQuery } = supabase.queries;
    expect(documentsQuery.in).not.toHaveBeenCalledWith('id', expect.anything());
    expect(tenantDocumentsQuery.select).not.toHaveBeenCalled();
    expect(signatureDocumentsQuery.select).not.toHaveBeenCalled();
  });

  it('throws when Supabase returns an error', async () => {
    const supabase = createSupabaseStub({
      documentsResult: { data: null as any, error: { message: 'boom' } },
      tenantDocumentsResult: { data: [{ id: 'doc-1' }] as any, error: null },
      signatureDocumentsResult: { data: [], error: null },
    });

    await expect(
      fetchDocumentsList({ client: supabase as any, userId: 'user-1', role: 'tenant' })
    ).rejects.toThrow(/Failed to fetch documents: boom/);
  });

  it('returns an empty array when no accessible documents exist', async () => {
    const supabase = createSupabaseStub({
      documentsResult: { data: [{ id: 'doc-1' }] as any, error: null },
      tenantDocumentsResult: { data: [], error: null },
      signatureDocumentsResult: { data: [], error: null },
    });

    const documents = await fetchDocumentsList({
      client: supabase as any,
      userId: 'user-123',
      role: 'tenant',
    });

    expect(documents).toEqual([]);
    const { documentsQuery } = supabase.queries;
    const idFilterCall = documentsQuery.in.mock.calls.find(([column]) => column === 'id');
    expect(idFilterCall).toBeUndefined();
  });
});

describe('fetchDocumentStats', () => {
  it('computes stats for scoped users', async () => {
    const query = createQueryBuilder({
      data: [
        { status: 'draft' },
        { status: 'signed' },
        { status: 'pending_signature' },
      ] as any,
      error: null,
    });
    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe('documents');
        return query;
      }),
    };

    const stats = await fetchDocumentStats({
      client: supabase as any,
      userId: 'tenant-1',
      role: 'tenant',
    });

    expect(query.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    expect(stats).toEqual({
      total_documents: 3,
      pending_signatures: 1,
      signed_documents: 1,
      expired_documents: 0,
      draft_documents: 1,
    });
  });

  it('omits tenant filter for admins', async () => {
    const query = createQueryBuilder({ data: [], error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe('documents');
        return query;
      }),
    };

    await fetchDocumentStats({ client: supabase as any, userId: 'admin-1', role: 'admin' });

    expect(query.eq).not.toHaveBeenCalled();
  });

  it('throws when Supabase returns an error', async () => {
    const query = createQueryBuilder({ data: null as any, error: { message: 'stats failed' } });
    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe('documents');
        return query;
      }),
    };

    await expect(
      fetchDocumentStats({ client: supabase as any, userId: 'user-1', role: 'tenant' })
    ).rejects.toThrow(/Failed to fetch document statistics: stats failed/);
  });
});
