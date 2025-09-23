import { describe, expect, it, vi } from 'vitest';
import {
  fetchDocumentStats,
  fetchDocumentsList,
  fetchSavedDocumentViewBySlug,
  saveDocumentView,
} from '@/lib/data/documents';
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
  } = {
    select: vi.fn().mockImplementation(() => builder),
    order: vi.fn().mockImplementation(() => builder),
    or: vi.fn().mockImplementation(() => builder),
    in: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation(() => builder),
    gte: vi.fn().mockImplementation(() => builder),
    lte: vi.fn().mockImplementation(() => builder),
  };

  (builder as QueryBuilder<T>).then = (onFulfilled) =>
    Promise.resolve(onFulfilled(result));

  return builder as QueryBuilder<T>;
}

function createSupabaseStub<T extends unknown[]>(query: QueryBuilder<T>) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe('documents');
      return query;
    }),
  };
}

type SavedViewQueryResult<T> = { data: T; error: { message: string } | null };

function createSavedViewSelectQuery<T>(result: SavedViewQueryResult<T>) {
  const builder = {
    select: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation(() => builder),
    maybeSingle: vi.fn().mockResolvedValue(result),
  } as const;

  return builder;
}

function createSavedViewSelectClient<T>(result: SavedViewQueryResult<T>) {
  const query = createSavedViewSelectQuery(result);
  const supabase = {
    from: vi.fn((table: string) => {
      expect(table).toBe('saved_views');
      return query;
    }),
  };

  return { supabase, query };
}

function createSavedViewInsertClient(
  responses: SavedViewQueryResult<unknown>[]
) {
  const queue = [...responses];
  const builder = {
    insert: vi.fn().mockImplementation(() => builder),
    select: vi.fn().mockImplementation(() => builder),
    single: vi.fn().mockImplementation(() => Promise.resolve(queue.shift()!)),
  } as const;

  const supabase = {
    from: vi.fn((table: string) => {
      expect(table).toBe('saved_views');
      return builder;
    }),
  };

  return { supabase, builder };
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

describe('saved view helpers', () => {
  it('fetchSavedDocumentViewBySlug returns normalized saved view data', async () => {
    const { supabase, query } = createSavedViewSelectClient({
      data: {
        id: 'view-1',
        slug: 'signed-leases',
        name: 'Signed leases',
        resource: 'documents',
        created_by: 'user-1',
        created_at: '2024-01-01',
        filters: { status: ['signed', 'draft'], type: ['lease'] },
      },
      error: null,
    });

    const savedView = await fetchSavedDocumentViewBySlug({
      client: supabase as any,
      slug: 'signed-leases',
    });

    expect(query.eq).toHaveBeenNthCalledWith(1, 'slug', 'signed-leases');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'resource', 'documents');
    expect(savedView).toEqual({
      id: 'view-1',
      slug: 'signed-leases',
      name: 'Signed leases',
      resource: 'documents',
      created_by: 'user-1',
      created_at: '2024-01-01',
      filters: { status: ['draft', 'signed'], type: ['lease'] },
    });
  });

  it('returns null when the saved view is not found', async () => {
    const { supabase } = createSavedViewSelectClient({ data: null, error: null });

    const result = await fetchSavedDocumentViewBySlug({
      client: supabase as any,
      slug: 'missing-view',
    });

    expect(result).toBeNull();
  });

  it('throws when fetching a saved view fails', async () => {
    const { supabase } = createSavedViewSelectClient({
      data: null,
      error: { message: 'boom' },
    });

    await expect(
      fetchSavedDocumentViewBySlug({ client: supabase as any, slug: 'broken' })
    ).rejects.toThrow(/Failed to load saved view: boom/);
  });

  it('saveDocumentView persists normalized filters and returns the saved view', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.123456);
    try {
      const { supabase, builder } = createSavedViewInsertClient([
        {
          data: {
            id: 'view-42',
            slug: 'important-abc123',
            name: 'Important docs',
            resource: 'documents',
            created_by: 'user-99',
            created_at: '2024-02-01',
            filters: { status: ['signed'], type: ['lease'], unit_id: 'unit-9' },
          },
          error: null,
        },
      ]);

      const result = await saveDocumentView({
        client: supabase as any,
        userId: 'user-99',
        name: 'Important docs',
        filters: {
          status: ['signed', 'signed'],
          type: ['lease'],
          unit_id: 'unit-9',
          tenant_id: undefined,
        } as DocumentListFilters,
      });

      expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({
        slug: expect.stringMatching(/^important-docs-/),
        name: 'Important docs',
        resource: 'documents',
        created_by: 'user-99',
        filters: { status: ['signed'], type: ['lease'], unit_id: 'unit-9' },
      }));
      expect(result).toEqual({
        id: 'view-42',
        slug: 'important-abc123',
        name: 'Important docs',
        resource: 'documents',
        created_by: 'user-99',
        created_at: '2024-02-01',
        filters: { status: ['signed'], type: ['lease'], unit_id: 'unit-9' },
      });
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('retries slug generation when a duplicate is detected', async () => {
    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.2);

    try {
      const { supabase, builder } = createSavedViewInsertClient([
        { data: null, error: { message: 'duplicate key value violates unique constraint' } },
        {
          data: {
            id: 'view-77',
            slug: 'custom-slug',
            name: 'My filters',
            resource: 'documents',
            created_by: 'user-77',
            created_at: '2024-03-03',
            filters: {},
          },
          error: null,
        },
      ]);

      const result = await saveDocumentView({
        client: supabase as any,
        userId: 'user-77',
        name: 'My filters',
        filters: {},
      });

      expect(builder.insert).toHaveBeenCalledTimes(2);
      expect(result.slug).toBe('custom-slug');
    } finally {
      randomSpy.mockRestore();
    }
  });
});
