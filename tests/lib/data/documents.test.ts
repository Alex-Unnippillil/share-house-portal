import { describe, expect, it, vi } from 'vitest';
import {
  fetchDocumentSavedViews,
  fetchDocumentStats,
  fetchDocumentsList,
  upsertDocumentSavedView,
} from '@/lib/data/documents';
import {
  parseDocumentFilters,
  serializeDocumentFilters,
} from '@/lib/documents-filters';
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
  upsert: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: (onFulfilled: (value: QueryResult<T>) => unknown) => Promise<unknown>;
};

function createDocumentsQuery<T extends unknown[]>(result: QueryResult<T>) {
  const builder: Partial<QueryBuilder<T>> & {
    select: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    or: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
  } = {
    select: vi.fn().mockImplementation(() => builder),
    order: vi.fn().mockImplementation(() => builder),
    or: vi.fn().mockImplementation(() => builder),
    in: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation(() => builder),
    gte: vi.fn().mockImplementation(() => builder),
    lte: vi.fn().mockImplementation(() => builder),
    upsert: vi.fn().mockImplementation(() => builder),
    single: vi.fn().mockImplementation(() => builder),
  };

  (builder as QueryBuilder<T>).then = (onFulfilled) =>
    Promise.resolve(onFulfilled(result));

  return builder as QueryBuilder<T>;
}

function createSupabaseStub<T extends unknown[]>(
  query: QueryBuilder<T>,
  expectedTable = 'documents',
) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe(expectedTable);
      return query;
    }),
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

    expect(documents).toEqual([{ id: 'doc-1', versions: [] }]);
    expect(query.or).toHaveBeenCalledWith('tenant_id.eq.user-123,signatures.signer_id.eq.user-123');
    expect(query.in).toHaveBeenCalledWith('status', filters.status);
    expect(query.in).toHaveBeenCalledWith('document_type', filters.type);
    expect(query.eq).toHaveBeenCalledWith('tenant_id', filters.tenant_id);
    expect(query.eq).toHaveBeenCalledWith('unit_id', filters.unit_id);
    expect(query.gte).toHaveBeenCalledWith('created_at', filters.date_from);
    expect(query.lte).toHaveBeenCalledWith('created_at', filters.date_to);
  });

  it('normalizes condition based filters', async () => {
    const query = createDocumentsQuery({ data: [], error: null });
    const supabase = createSupabaseStub(query);

    await fetchDocumentsList({
      client: supabase,
      userId: 'user-123',
      role: 'tenant',
      filters: {
        conditions: [
          { field: 'status', operator: 'in', value: ['draft'] },
          { field: 'created_at', operator: 'gte', value: '2024-01-01T00:00:00.000Z' },
        ],
      },
    });

    expect(query.in).toHaveBeenCalledWith('status', ['draft']);
    expect(query.gte).toHaveBeenCalledWith('created_at', '2024-01-01T00:00:00.000Z');
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
  });

  it('throws when Supabase returns an error', async () => {
    const query = createDocumentsQuery({ data: null as any, error: { message: 'boom' } });
    const supabase = createSupabaseStub(query);

    await expect(
      fetchDocumentsList({ client: supabase, userId: 'user-1', role: 'tenant' })
    ).rejects.toThrow(/Failed to fetch documents: boom/);
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
  });

  it('omits tenant filter for admins', async () => {
    const query = createDocumentsQuery({ data: [], error: null });
    const supabase = createSupabaseStub(query);

    await fetchDocumentStats({ client: supabase, userId: 'admin-1', role: 'admin' });

    expect(query.eq).not.toHaveBeenCalled();
  });

  it('throws when Supabase returns an error', async () => {
    const query = createDocumentsQuery({ data: null as any, error: { message: 'stats failed' } });
    const supabase = createSupabaseStub(query);

    await expect(
      fetchDocumentStats({ client: supabase, userId: 'user-1', role: 'tenant' })
    ).rejects.toThrow(/Failed to fetch document statistics: stats failed/);
  });
});

describe('document saved views', () => {
  it('fetches saved views for a user', async () => {
    const query = createDocumentsQuery({
      data: [
        {
          id: 'view-1',
          user_id: 'user-1',
          name: 'Pending signatures',
          filters: { status: ['pending_signature'] },
          created_at: null,
          updated_at: null,
        },
      ] as any,
      error: null,
    });
    const supabase = createSupabaseStub(query, 'document_saved_views');

    const views = await fetchDocumentSavedViews({ client: supabase, userId: 'user-1' });

    expect(query.select).toHaveBeenCalledWith('*');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(query.order).toHaveBeenCalledWith('name', { ascending: true });
    expect(views).toEqual([
      {
        id: 'view-1',
        user_id: 'user-1',
        name: 'Pending signatures',
        filters: {
          status: ['pending_signature'],
          conditions: [
            {
              field: 'status',
              operator: 'in',
              value: ['pending_signature'],
            },
          ],
        },
        created_at: null,
        updated_at: null,
      },
    ]);
  });

  it('saves a view and returns the normalized payload', async () => {
    const query = createDocumentsQuery({
      data: {
        id: 'view-2',
        user_id: 'user-1',
        name: 'Leases only',
        filters: { type: ['lease'] },
        created_at: null,
        updated_at: null,
      } as any,
      error: null,
    });
    const supabase = createSupabaseStub(query, 'document_saved_views');

    const view = await upsertDocumentSavedView({
      client: supabase,
      userId: 'user-1',
      view: {
        name: 'Leases only',
        filters: { type: ['lease'] },
      },
    });

    expect(query.upsert).toHaveBeenCalled();
    expect(query.select).toHaveBeenCalledWith('*');
    expect(query.single).toHaveBeenCalled();

    const upsertPayload = query.upsert.mock.calls[0][0];
    expect(upsertPayload.user_id).toBe('user-1');
    expect(upsertPayload.name).toBe('Leases only');
    expect(upsertPayload.filters).toEqual({
      type: ['lease'],
      conditions: [
        { field: 'type', operator: 'in', value: ['lease'] },
      ],
    });

    expect(view).toEqual({
      id: 'view-2',
      user_id: 'user-1',
      name: 'Leases only',
      filters: {
        type: ['lease'],
        conditions: [
          { field: 'type', operator: 'in', value: ['lease'] },
        ],
      },
      created_at: null,
      updated_at: null,
    });
  });
});

describe('document filter serialization', () => {
  it('round trips filters through the query string', () => {
    const filters: DocumentListFilters = {
      status: ['draft'],
      type: ['lease'],
      date_from: '2024-01-01T00:00:00.000Z',
    };

    const serialized = serializeDocumentFilters(filters);
    expect(serialized).toBeTruthy();

    const parsed = parseDocumentFilters(serialized);

    expect(parsed).toEqual({
      status: ['draft'],
      type: ['lease'],
      date_from: '2024-01-01T00:00:00.000Z',
      conditions: [
        { field: 'status', operator: 'in', value: ['draft'] },
        { field: 'type', operator: 'in', value: ['lease'] },
        { field: 'created_at', operator: 'gte', value: '2024-01-01T00:00:00.000Z' },
      ],
    });
  });

  it('handles invalid payloads gracefully', () => {
    const parsed = parseDocumentFilters('%');
    expect(parsed).toEqual({});
  });
});
