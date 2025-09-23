import { describe, expect, it, vi } from 'vitest';
import { fetchDocumentStats, fetchDocumentsList } from '@/lib/data/documents';
import type { DocumentListFilters } from '@/types/documents';

type QueryResult<T> = { data: T; error: { message: string } | null };

type QueryBuilder<T> = {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  then: (onFulfilled: (value: QueryResult<T>) => unknown) => Promise<unknown>;
  getExecutions: () => number;
};

function createDocumentsQuery<T extends unknown[]>(result: QueryResult<T>) {
  let executions = 0;

  const builder: (Partial<Omit<QueryBuilder<T>, 'getExecutions'>> & {
    select: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    or: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
  }) & { getExecutions?: () => number } = {
    select: vi.fn().mockImplementation(() => builder),
    order: vi.fn().mockImplementation(() => builder),
    or: vi.fn().mockImplementation(() => builder),
    in: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation(() => builder),
    gte: vi.fn().mockImplementation(() => builder),
    lte: vi.fn().mockImplementation(() => builder),
  };

  (builder as QueryBuilder<T>).then = (onFulfilled) => {
    executions += 1;
    return Promise.resolve(onFulfilled(result));
  };

  (builder as QueryBuilder<T>).getExecutions = () => executions;

  return builder as QueryBuilder<T>;
}

function createSupabaseStub<T extends unknown[]>(query: QueryBuilder<T>) {
  let fromCalls = 0;

  return {
    from: vi.fn((table: string) => {
      fromCalls += 1;
      expect(table).toBe('documents');
      return query;
    }),
    getQueryCount: () => fromCalls,
  };
}

describe('fetchDocumentsList', () => {
  it('applies role scoping and filters for non privileged members', async () => {
    const query = createDocumentsQuery({ data: [{ id: 'doc-1' }] as any, error: null });
    const supabase = createSupabaseStub(query);

    const filters: DocumentListFilters = {
      status: ['draft', 'signed'],
      type: ['lease'],
      tenant_id: 'tenant-123',
      unit_id: 'unit-456',
      date_from: '2024-01-01',
      date_to: '2024-12-31',
    };

    const documents = await fetchDocumentsList({
      client: supabase,
      userId: 'user-123',
      role: 'tenant',
      filters,
    });

    expect(documents).toEqual([{ id: 'doc-1' }]);
    expect(query.or).toHaveBeenCalledWith('tenant_id.eq.user-123,signatures.signer_id.eq.user-123');
    expect(query.in).toHaveBeenCalledWith('status', filters.status);
    expect(query.in).toHaveBeenCalledWith('document_type', filters.type);
    expect(query.eq).toHaveBeenCalledWith('tenant_id', filters.tenant_id);
    expect(query.eq).toHaveBeenCalledWith('unit_id', filters.unit_id);
    expect(query.gte).toHaveBeenCalledWith('created_at', filters.date_from);
    expect(query.lte).toHaveBeenCalledWith('created_at', filters.date_to);
    // Guardrail: ensure we only execute a single Supabase query for the listing fetch.
    expect(supabase.getQueryCount()).toBe(1);
    expect(query.getExecutions()).toBe(1);
  });

  it('skips scoping for property managers and admins', async () => {
    const query = createDocumentsQuery({ data: [], error: null });
    const supabase = createSupabaseStub(query);

    await fetchDocumentsList({
      client: supabase,
      userId: 'manager-1',
      role: 'property_manager',
    });

    expect(query.or).not.toHaveBeenCalled();
    expect(supabase.getQueryCount()).toBe(1);
    expect(query.getExecutions()).toBe(1);
  });

  it('throws when Supabase returns an error', async () => {
    const query = createDocumentsQuery({ data: null as any, error: { message: 'boom' } });
    const supabase = createSupabaseStub(query);

    await expect(
      fetchDocumentsList({ client: supabase, userId: 'user-1', role: 'tenant' })
    ).rejects.toThrow(/Failed to fetch documents: boom/);
    expect(supabase.getQueryCount()).toBe(1);
    expect(query.getExecutions()).toBe(1);
  });
});

describe('fetchDocumentStats', () => {
  it('computes stats for scoped users', async () => {
    const query = createDocumentsQuery({
      data: [
        { status: 'draft' },
        { status: 'signed' },
        { status: 'pending_signature' },
      ] as any,
      error: null,
    });
    const supabase = createSupabaseStub(query);

    const stats = await fetchDocumentStats({
      client: supabase,
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
    expect(supabase.getQueryCount()).toBe(1);
    expect(query.getExecutions()).toBe(1);
  });

  it('omits tenant filter for admins', async () => {
    const query = createDocumentsQuery({ data: [], error: null });
    const supabase = createSupabaseStub(query);

    await fetchDocumentStats({ client: supabase, userId: 'admin-1', role: 'admin' });

    expect(query.eq).not.toHaveBeenCalled();
    expect(supabase.getQueryCount()).toBe(1);
    expect(query.getExecutions()).toBe(1);
  });

  it('throws when Supabase returns an error', async () => {
    const query = createDocumentsQuery({ data: null as any, error: { message: 'stats failed' } });
    const supabase = createSupabaseStub(query);

    await expect(
      fetchDocumentStats({ client: supabase, userId: 'user-1', role: 'tenant' })
    ).rejects.toThrow(/Failed to fetch document statistics: stats failed/);
    expect(supabase.getQueryCount()).toBe(1);
    expect(query.getExecutions()).toBe(1);
  });
});
