import { describe, expect, it, vi, afterEach } from 'vitest';

import { getDocumentsListPayload } from '@/lib/data/documents';
import { getVisitorBookingContext } from '@/lib/data/visitors';
import * as instrumentation from '@/lib/data/instrumentation';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('network request budgeting', () => {
  it('limits visitor loader to two Supabase requests', async () => {
    const recordSpy = vi.spyOn(instrumentation, 'recordNetworkBatch');

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'user@example.com' } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: {
          host_profile: {
            id: 'user-1',
            full_name: 'User Example',
            email: 'user@example.com',
            unit_id: 'unit-1',
          },
          roommates: [
            {
              id: 'roommate-1',
              full_name: 'Room Mate',
              email: 'room@example.com',
              role: 'tenant',
            },
          ],
          property_manager: {
            id: 'manager-1',
            full_name: 'Manager Example',
            email: 'manager@example.com',
            role: 'property_manager',
          },
        },
        error: null,
      }),
    } as any;

    const context = await getVisitorBookingContext({ client: mockClient });

    expect(context.userId).toBe('user-1');
    expect(mockClient.auth.getUser).toHaveBeenCalledTimes(1);
    expect(mockClient.rpc).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith('visitors.page', expect.any(Number));
    expect(recordSpy.mock.calls[0][1]).toBeLessThanOrEqual(2);
  });

  it('limits documents loader to two Supabase requests', async () => {
    const recordSpy = vi.spyOn(instrumentation, 'recordNetworkBatch');

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-2', email: 'user2@example.com' } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'doc-1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            title: 'Lease Document',
            description: 'Primary lease',
            document_type: 'lease',
            status: 'signed',
            metadata: {},
            requires_signature: false,
            lease: { tenant_ids: ['user-2'] },
            signatures: [],
          },
        ],
        error: null,
      }),
    } as any;

    const payload = await getDocumentsListPayload({ client: mockClient });

    expect(payload.documents).toHaveLength(1);
    expect(mockClient.auth.getUser).toHaveBeenCalledTimes(1);
    expect(mockClient.rpc).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith('documents.page', expect.any(Number));
    expect(recordSpy.mock.calls[0][1]).toBeLessThanOrEqual(2);
  });
});
