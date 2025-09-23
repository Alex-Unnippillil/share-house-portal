import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, fetchMemberRoleMock, revalidatePathMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  fetchMemberRoleMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn() })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock('@/utils/supa-server-actions', () => ({
  createClient: createClientMock,
}));

vi.mock('@/lib/data/members', () => ({
  fetchMemberRole: fetchMemberRoleMock,
}));

import {
  bulkDeleteDocumentsAction,
  bulkExportDocumentsAction,
  bulkTagDocumentsAction,
} from '@/app/documents/actions';

function createSupabaseStub(
  rpcHandlers: Record<string, (args: any) => Promise<{ data: any; error: any }>> = {},
) {
  const rpcMock = vi.fn(async (fnName: string, args: any) => {
    const handler = rpcHandlers[fnName];
    if (handler) {
      return handler(args);
    }

    return { data: null, error: null };
  });

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'manager-1' } },
        error: null,
      })),
    },
    rpc: rpcMock,
  };
}

beforeEach(() => {
  createClientMock.mockReset();
  fetchMemberRoleMock.mockReset();
  revalidatePathMock.mockReset();
});

describe('documents bulk actions', () => {
  it('deletes all selected documents via batch endpoint', async () => {
    const ids = [
      '11111111-2222-3333-4444-555555555551',
      '11111111-2222-3333-4444-555555555552',
    ];

    const rpcSpy = vi.fn(async (args: any) => ({
      data: { deleted_ids: args.document_ids },
      error: null,
    }));

    const supabaseStub = createSupabaseStub({
      documents_bulk_delete: rpcSpy,
    });

    createClientMock.mockReturnValue(supabaseStub as any);
    fetchMemberRoleMock.mockResolvedValue('property_manager');

    const result = await bulkDeleteDocumentsAction(ids);

    expect(supabaseStub.rpc).toHaveBeenCalledWith('documents_bulk_delete', {
      document_ids: ids,
    });
    expect(rpcSpy).toHaveBeenCalledWith({ document_ids: ids });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ deleted_ids: ids });
    expect(revalidatePathMock).toHaveBeenCalledWith('/documents');
  });

  it('applies tags and moves selected documents', async () => {
    const ids = [
      '11111111-2222-3333-4444-555555555553',
      '11111111-2222-3333-4444-555555555554',
    ];

    const rpcSpy = vi.fn(async (args: any) => ({
      data: {
        updated_ids: args.document_ids,
        applied_tag: args.tag,
        destination_unit_id: args.destination_unit_id,
      },
      error: null,
    }));

    const supabaseStub = createSupabaseStub({
      documents_bulk_tag: rpcSpy,
    });

    createClientMock.mockReturnValue(supabaseStub as any);
    fetchMemberRoleMock.mockResolvedValue('admin');

    const payload = {
      documentIds: ids,
      tag: 'renewal',
      unitId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    };

    const result = await bulkTagDocumentsAction(payload);

    expect(supabaseStub.rpc).toHaveBeenCalledWith('documents_bulk_tag', {
      document_ids: ids,
      tag: 'renewal',
      destination_unit_id: payload.unitId,
    });
    expect(rpcSpy).toHaveBeenCalledWith({
      document_ids: ids,
      tag: 'renewal',
      destination_unit_id: payload.unitId,
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      updated_ids: ids,
      applied_tag: 'renewal',
      destination_unit_id: payload.unitId,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/documents');
  });

  it('exports all selected documents', async () => {
    const ids = [
      '11111111-2222-3333-4444-555555555555',
      '11111111-2222-3333-4444-555555555556',
    ];

    const rpcSpy = vi.fn(async (args: any) => ({
      data: { export_url: 'https://example.com/export.zip' },
      error: null,
    }));

    const supabaseStub = createSupabaseStub({
      documents_bulk_export: rpcSpy,
    });

    createClientMock.mockReturnValue(supabaseStub as any);
    fetchMemberRoleMock.mockResolvedValue('property_manager');

    const result = await bulkExportDocumentsAction(ids);

    expect(supabaseStub.rpc).toHaveBeenCalledWith('documents_bulk_export', {
      document_ids: ids,
    });
    expect(rpcSpy).toHaveBeenCalledWith({ document_ids: ids });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ export_url: 'https://example.com/export.zip' });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
