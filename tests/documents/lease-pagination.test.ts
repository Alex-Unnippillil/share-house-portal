import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';

import { paginateLeaseRows } from '@/app/documents/actions';
import type { DocumentWithLease } from '@/types/documents';

function createMockDocument(index: number): DocumentWithLease {
  const timestamp = new Date(Date.now() - index * 60_000).toISOString();

  return {
    id: `doc-${index}`,
    created_at: timestamp,
    updated_at: timestamp,
    title: `Document ${index}`,
    document_type: 'lease',
    status: 'signed',
    metadata: {},
    requires_signature: false,
    version: 1,
    lease: {
      id: `lease-${index}`,
      document_id: `doc-${index}`,
      created_at: timestamp,
      updated_at: timestamp,
      start_date: timestamp,
      rent_frequency: 'monthly',
      tenant_ids: [],
      auto_renew: false,
      renewal_notice_days: 0,
      status: 'signed',
    },
    signatures: [],
  };
}

describe('paginateLeaseRows', () => {
  it('limits leases to the requested page size and returns a cursor', () => {
    const rows = Array.from({ length: 30 }, (_, index) => createMockDocument(index));
    const result = paginateLeaseRows(rows, 25);

    expect(result.items).toHaveLength(25);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(rows[24].created_at);
  });

  it('returns all results when fewer than the limit are provided', () => {
    const rows = Array.from({ length: 5 }, (_, index) => createMockDocument(index));
    const result = paginateLeaseRows(rows, 25);

    expect(result.items).toHaveLength(5);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('processes one thousand leases well under one second', () => {
    const rows = Array.from({ length: 1000 }, (_, index) => createMockDocument(index));
    const start = performance.now();
    const result = paginateLeaseRows(rows, 25);
    const duration = performance.now() - start;

    expect(result.items).toHaveLength(25);
    expect(result.hasMore).toBe(true);
    expect(duration).toBeLessThan(1000);
  });
});
