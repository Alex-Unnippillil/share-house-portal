import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCookies = vi.fn();
const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockFetchMemberRole = vi.fn();
const mockFetchDocumentsList = vi.fn();
const loggerInfo = vi.fn();
const loggerWarn = vi.fn();

vi.mock('next/headers', () => ({
  cookies: mockCookies,
}));

vi.mock('@/utils/supa-server-actions', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  })),
}));

vi.mock('@/lib/data/members', () => ({
  fetchMemberRole: mockFetchMemberRole,
}));

vi.mock('@/lib/data/documents', () => ({
  fetchDocumentsList: mockFetchDocumentsList,
  fetchDocumentStats: vi.fn(),
}));

vi.mock('@/lib/observability/logger', () => ({
  createStructuredLogger: vi.fn(() => ({
    info: loggerInfo,
    warn: loggerWarn,
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('getDocumentsAction audit logging', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockCookies.mockReturnValue({});
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFetchMemberRole.mockResolvedValue('tenant');
  });

  it('skips audit call for empty document list', async () => {
    mockFetchDocumentsList.mockResolvedValue([]);

    const { getDocumentsAction } = await import('@/app/documents/actions');
    const result = await getDocumentsAction();

    expect(result.success).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('writes one bulk audit call for multi-document lists', async () => {
    mockFetchDocumentsList.mockResolvedValue([{ id: 'doc-1' }, { id: 'doc-2' }]);
    mockRpc.mockResolvedValue({ data: ['audit-1', 'audit-2'], error: null });

    const { getDocumentsAction } = await import('@/app/documents/actions');
    const result = await getDocumentsAction();

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('log_document_access_bulk', {
      p_document_ids: ['doc-1', 'doc-2'],
      p_action: 'view',
      p_metadata: { source: 'documents_page' },
    });
    expect(loggerInfo).toHaveBeenCalledWith(
      'documents_audit_batch_attempted',
      expect.objectContaining({
        auditBatchSize: 2,
      }),
    );
  });

  it('returns documents when audit write fails and records warning telemetry', async () => {
    mockFetchDocumentsList.mockResolvedValue([{ id: 'doc-9' }]);
    mockRpc.mockRejectedValue(new Error('audit insert failed'));

    const { getDocumentsAction } = await import('@/app/documents/actions');
    const result = await getDocumentsAction();

    await Promise.resolve();

    expect(result).toEqual({ success: true, data: [{ id: 'doc-9' }] });
    expect(loggerWarn).toHaveBeenCalledWith(
      'documents_audit_batch_failed',
      expect.objectContaining({
        auditBatchSize: 1,
        error: 'audit insert failed',
      }),
    );
  });
});
