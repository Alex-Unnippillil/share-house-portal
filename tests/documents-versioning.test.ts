import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, fetchMemberRoleMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  fetchMemberRoleMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn() })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/utils/supa-server-actions', () => ({
  createClient: createClientMock,
}));

vi.mock('@/lib/data/members', () => ({
  fetchMemberRole: fetchMemberRoleMock,
}));

import {
  publishDocumentAction,
  rollbackDocumentAction,
} from '@/app/documents/actions';

type DocumentRow = {
  id: string;
  title: string;
  description: string | null;
  document_type: 'lease';
  status: 'draft' | 'pending_signature' | 'signed' | 'expired' | 'cancelled';
  state: 'draft' | 'published';
  file_url: string | null;
  metadata: Record<string, any> | null;
  requires_signature: boolean;
  expires_at: string | null;
  signed_at: string | null;
  tenant_id: string | null;
  unit_id: string | null;
  documenso_envelope_id: string | null;
  documenso_template_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  version: number | null;
};

type VersionRow = {
  id: string;
  document_id: string;
  version: number;
  state: 'draft' | 'published';
  status: DocumentRow['status'];
  snapshot: Record<string, any>;
  created_at: string;
  created_by: string | null;
  published_at: string | null;
};

type SupabaseStub = ReturnType<typeof createSupabaseStub>;

function createSupabaseStub({
  document,
  versions = [],
}: {
  document: DocumentRow;
  versions?: VersionRow[];
}) {
  let currentDocument = { ...document };
  const storedVersions = [...versions];
  const insertedVersions: any[] = [];

  const applyDocumentUpdate = (payload: Partial<DocumentRow>) => {
    currentDocument = { ...currentDocument, ...payload };
    return { data: currentDocument, error: null };
  };

  const documentsBuilder = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({ data: currentDocument, error: null })),
      })),
    })),
    update: vi.fn((payload: Partial<DocumentRow>) => ({
      eq: vi.fn(() => {
        const result: any = {
          select: vi.fn(() => ({
            single: vi.fn(async () => applyDocumentUpdate(payload)),
          })),
        };

        result.then = (onFulfilled: (value: { data: DocumentRow; error: null }) => unknown) =>
          Promise.resolve(onFulfilled(applyDocumentUpdate(payload)));
        result.catch = () => result;
        result.finally = (onFinally?: () => unknown) => {
          onFinally?.();
          return Promise.resolve();
        };

        return result;
      }),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(async () => ({ data: null, error: null })),
    })),
  };

  const createVersionSelectBuilder = (filters: Partial<Record<'document_id' | 'version', string | number>> = {}) => ({
    eq: vi.fn((column: 'document_id' | 'version', value: string | number) =>
      createVersionSelectBuilder({ ...filters, [column]: value })
    ),
    single: vi.fn(async () => {
      const match = storedVersions.find((version) => {
        if (filters.document_id && version.document_id !== filters.document_id) return false;
        if (filters.version && version.version !== filters.version) return false;
        return true;
      });

      if (!match) {
        return { data: null, error: { message: 'not found' } };
      }

      return { data: match, error: null };
    }),
  });

  const versionsBuilder = {
    insert: vi.fn(async (payload: any) => {
      insertedVersions.push(payload);
      storedVersions.push({
        id: `version-${storedVersions.length + 1}`,
        document_id: payload.document_id,
        version: payload.version,
        state: payload.state,
        status: payload.status,
        snapshot: payload.snapshot,
        created_at: new Date().toISOString(),
        created_by: payload.created_by ?? null,
        published_at: payload.published_at ?? null,
      });
      return { data: null, error: null };
    }),
    select: vi.fn(() => createVersionSelectBuilder()),
  };

  const supabaseStub = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'manager-1' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'documents') {
        return documentsBuilder;
      }

      if (table === 'document_versions') {
        return versionsBuilder;
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };

  return Object.assign(supabaseStub, {
    getCurrentDocument: () => currentDocument,
    getInsertedVersions: () => insertedVersions,
  });
}

describe('document versioning actions', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    fetchMemberRoleMock.mockReset();
  });

  it('appends a new version record when publishing a draft', async () => {
    const document: DocumentRow = {
      id: 'doc-1',
      title: 'Lease Agreement',
      description: null,
      document_type: 'lease',
      status: 'draft',
      state: 'draft',
      file_url: null,
      metadata: {},
      requires_signature: true,
      expires_at: null,
      signed_at: null,
      tenant_id: null,
      unit_id: null,
      documenso_envelope_id: null,
      documenso_template_id: null,
      created_by: 'manager-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: null,
      version: 1,
    };

    const versions: VersionRow[] = [
      {
        id: 'version-1',
        document_id: 'doc-1',
        version: 1,
        state: 'draft',
        status: 'draft',
        snapshot: {
          title: document.title,
          description: document.description,
          document_type: document.document_type,
          status: document.status,
          state: document.state,
          metadata: {},
          requires_signature: true,
        },
        created_at: document.created_at,
        created_by: document.created_by,
        published_at: null,
      },
    ];

    const supabaseStub: SupabaseStub = createSupabaseStub({ document, versions });
    createClientMock.mockReturnValue(supabaseStub);
    fetchMemberRoleMock.mockResolvedValue('property_manager');

    const result = await publishDocumentAction('doc-1');

    expect(result.success).toBe(true);
    const updated = supabaseStub.getCurrentDocument();
    expect(updated.state).toBe('published');
    expect(updated.version).toBe(2);
    expect(updated.status).toBe('pending_signature');

    const inserts = supabaseStub.getInsertedVersions();
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      document_id: 'doc-1',
      version: 2,
      state: 'published',
      status: 'pending_signature',
    });
  });

  it('restores prior snapshot and appends version when rolling back', async () => {
    const document: DocumentRow = {
      id: 'doc-1',
      title: 'Lease Agreement',
      description: 'Published version',
      document_type: 'lease',
      status: 'pending_signature',
      state: 'published',
      file_url: 'https://example.com/latest.pdf',
      metadata: {},
      requires_signature: true,
      expires_at: null,
      signed_at: null,
      tenant_id: null,
      unit_id: null,
      documenso_envelope_id: null,
      documenso_template_id: null,
      created_by: 'manager-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      version: 3,
    };

    const draftSnapshot = {
      title: 'Lease Agreement',
      description: 'Initial draft',
      document_type: 'lease',
      status: 'draft',
      state: 'draft',
      file_url: 'https://example.com/draft.pdf',
      metadata: {},
      requires_signature: true,
      expires_at: null,
      signed_at: null,
      tenant_id: null,
      unit_id: null,
      documenso_envelope_id: null,
      documenso_template_id: null,
    };

    const versions: VersionRow[] = [
      {
        id: 'version-1',
        document_id: 'doc-1',
        version: 1,
        state: 'draft',
        status: 'draft',
        snapshot: draftSnapshot,
        created_at: document.created_at,
        created_by: document.created_by,
        published_at: null,
      },
      {
        id: 'version-2',
        document_id: 'doc-1',
        version: 2,
        state: 'published',
        status: 'pending_signature',
        snapshot: {
          ...draftSnapshot,
          description: 'Published version',
          state: 'published',
          status: 'pending_signature',
        },
        created_at: document.created_at,
        created_by: document.created_by,
        published_at: document.published_at,
      },
      {
        id: 'version-3',
        document_id: 'doc-1',
        version: 3,
        state: 'published',
        status: 'pending_signature',
        snapshot: {
          ...draftSnapshot,
          description: 'Published version',
          state: 'published',
          status: 'pending_signature',
        },
        created_at: document.created_at,
        created_by: document.created_by,
        published_at: document.published_at,
      },
    ];

    const supabaseStub: SupabaseStub = createSupabaseStub({ document, versions });
    createClientMock.mockReturnValue(supabaseStub);
    fetchMemberRoleMock.mockResolvedValue('property_manager');

    const result = await rollbackDocumentAction({
      documentId: 'doc-1',
      targetVersion: 1,
    });

    expect(result.success).toBe(true);
    const updated = supabaseStub.getCurrentDocument();
    expect(updated.state).toBe('draft');
    expect(updated.status).toBe('draft');
    expect(updated.version).toBe(4);
    expect(updated.description).toBe('Initial draft');
    expect(updated.file_url).toBe('https://example.com/draft.pdf');

    const inserts = supabaseStub.getInsertedVersions();
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      document_id: 'doc-1',
      version: 4,
      state: 'draft',
      status: 'draft',
    });
  });
});
