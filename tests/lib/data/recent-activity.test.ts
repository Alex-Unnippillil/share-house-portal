import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchRecentActivity, recordRecentItemVisit } from '@/lib/data/recent-activity';
import type { Database } from '@/lib/supabase';

type RecentActivityRow = Database['public']['Tables']['user_recent_items']['Row'];

type RecentActivityStore = Map<string, RecentActivityRow>;

type UpsertPayload = Partial<RecentActivityRow> | Partial<RecentActivityRow>[];

class RecentActivityQueryBuilder {
  private result: RecentActivityRow[] = [];

  constructor(private readonly store: RecentActivityStore) {}

  upsert(payload: UpsertPayload) {
    const entries = Array.isArray(payload) ? payload : [payload];

    for (const entry of entries) {
      if (!entry.user_id || !entry.entity_type || !entry.entity_id) {
        continue;
      }

      const key = `${entry.user_id}:${entry.entity_type}:${entry.entity_id}`;
      const existing = this.store.get(key);
      const timestamp = entry.visited_at ?? new Date().toISOString();

      const record: RecentActivityRow = {
        id: existing?.id ?? `mock-${this.store.size + 1}`,
        user_id: entry.user_id,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        label: entry.label ?? existing?.label ?? '',
        last_visited_route: entry.last_visited_route ?? existing?.last_visited_route ?? '',
        visited_at: timestamp,
        created_at: existing?.created_at ?? timestamp,
        updated_at: timestamp,
      };

      this.store.set(key, record);
    }

    return Promise.resolve({ data: null, error: null });
  }

  select() {
    this.result = Array.from(this.store.values());
    return this;
  }

  eq(column: keyof RecentActivityRow, value: string) {
    this.result = this.result.filter((row) => row[column] === value);
    return this;
  }

  order(column: keyof RecentActivityRow, { ascending }: { ascending: boolean }) {
    const factor = ascending ? 1 : -1;
    this.result.sort((a, b) => {
      const first = a[column] ?? '';
      const second = b[column] ?? '';
      const firstTime = typeof first === 'string' ? new Date(first).getTime() : 0;
      const secondTime = typeof second === 'string' ? new Date(second).getTime() : 0;
      return (firstTime - secondTime) * factor;
    });
    return this;
  }

  limit(count: number) {
    return Promise.resolve({ data: this.result.slice(0, count), error: null });
  }
}

function createRecentActivityClient(store: RecentActivityStore = new Map()) {
  return {
    client: {
      from: (table: string) => {
        if (table !== 'user_recent_items') {
          throw new Error(`Unexpected table requested: ${table}`);
        }
        return new RecentActivityQueryBuilder(store);
      },
    } as unknown as { from: (table: string) => RecentActivityQueryBuilder },
    store,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('recent activity persistence', () => {
  it('persists visits across client sessions', async () => {
    vi.useFakeTimers();
    const { client, store } = createRecentActivityClient();

    vi.setSystemTime(new Date('2024-01-01T09:00:00Z'));
    await recordRecentItemVisit({
      client,
      userId: 'user-1',
      entityType: 'document',
      entityId: 'lease-1',
      label: 'Lease agreement',
      lastVisitedRoute: '/documents/lease-1',
    });

    const { client: newSession } = createRecentActivityClient(store);

    vi.setSystemTime(new Date('2024-01-03T12:00:00Z'));
    await recordRecentItemVisit({
      client: newSession,
      userId: 'user-1',
      entityType: 'payment',
      entityId: 'rent-jan',
      label: 'January rent',
      lastVisitedRoute: '/payments/history',
    });

    const { items } = await fetchRecentActivity({ client: newSession, userId: 'user-1' });

    expect(items).toHaveLength(2);
    expect(items[0].entity_id).toBe('rent-jan');
    expect(items[1].entity_id).toBe('lease-1');
  });

  it('restores the most recent route for returning sessions', async () => {
    vi.useFakeTimers();
    const { client } = createRecentActivityClient();

    vi.setSystemTime(new Date('2024-02-10T08:15:00Z'));
    await recordRecentItemVisit({
      client,
      userId: 'user-42',
      entityType: 'payment',
      entityId: 'rent-feb',
      label: 'February rent',
      lastVisitedRoute: '/payments',
    });

    vi.setSystemTime(new Date('2024-02-11T18:45:00Z'));
    await recordRecentItemVisit({
      client,
      userId: 'user-42',
      entityType: 'document',
      entityId: 'lease-update',
      label: 'Lease addendum',
      lastVisitedRoute: '/documents/lease-update',
    });

    const activity = await fetchRecentActivity({ client, userId: 'user-42' });

    expect(activity.items[0].last_visited_route).toBe('/documents/lease-update');
    expect(activity.lastRoute).toBe('/documents/lease-update');
  });
});
