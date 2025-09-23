import { describe, expect, it, vi } from 'vitest';

import {
  filterActivityEvents,
  sortActivityEvents,
  fetchActivityEvents,
  type ActivityEvent,
} from '@/lib/data/activity';

type QueryResult<T> = { data: T; error: { message: string } | null };

type QueryBuilder<T> = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  then: (onFulfilled: (value: QueryResult<T>) => unknown) => Promise<unknown>;
};

function createActivityQuery<T extends unknown[]>(result: QueryResult<T>, tableName: string) {
  const builder: Partial<QueryBuilder<T>> & {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
  } = {
    select: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation(() => builder),
    order: vi.fn().mockImplementation(() => builder),
    in: vi.fn().mockImplementation(() => builder),
  };

  (builder as QueryBuilder<T>).then = (onFulfilled) => Promise.resolve(onFulfilled(result));

  const supabase = {
    from: vi.fn((table: string) => {
      expect(table).toBe(tableName);
      return builder;
    }),
  };

  return { builder: builder as QueryBuilder<T>, supabase };
}

describe('fetchActivityEvents', () => {
  it('applies filters and sorts events for documents', async () => {
    const rows = [
      {
        id: 'evt-1',
        created_at: '2024-01-01T12:00:00.000Z',
        event_type: 'comment',
        actor_id: 'actor-1',
        metadata: { comment: 'First comment', actor_name: 'Ada' },
      },
    ];

    const { builder, supabase } = createActivityQuery({ data: rows as any, error: null }, 'document_events');

    const events = await fetchActivityEvents({
      client: supabase as any,
      entityId: 'doc-1',
      entityType: 'document',
      filters: { types: ['comment'] },
    });

    expect(builder.select).toHaveBeenCalledWith(
      'id, created_at, event_type, actor_id, message, description, note, metadata, attachments',
    );
    expect(builder.eq).toHaveBeenCalledWith('document_id', 'doc-1');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.in).toHaveBeenCalledWith('event_type', ['comment']);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'evt-1',
      entityId: 'doc-1',
      entityType: 'document',
      category: 'comment',
      actorName: 'Ada',
    });
  });

  it('throws when Supabase returns an error', async () => {
    const { supabase } = createActivityQuery(
      { data: null as any, error: { message: 'boom' } },
      'document_events',
    );

    await expect(
      fetchActivityEvents({ client: supabase as any, entityType: 'document', entityId: 'doc-1' })
    ).rejects.toThrow(/Failed to fetch document activity: boom/);
  });
});

describe('filterActivityEvents', () => {
  it('keeps events that match the requested categories', () => {
    const events: ActivityEvent[] = [
      {
        id: 'one',
        entityId: '1',
        entityType: 'document',
        rawType: 'comment',
        category: 'comment',
        createdAt: '2024-01-01T12:00:00.000Z',
        actorId: null,
        actorName: null,
        message: 'Hello',
        metadata: null,
        attachments: null,
      },
      {
        id: 'two',
        entityId: '1',
        entityType: 'document',
        rawType: 'status_change',
        category: 'status_change',
        createdAt: '2024-01-02T12:00:00.000Z',
        actorId: null,
        actorName: null,
        message: 'Status',
        metadata: null,
        attachments: null,
      },
      {
        id: 'three',
        entityId: '1',
        entityType: 'document',
        rawType: 'attachment',
        category: 'attachment',
        createdAt: '2024-01-03T12:00:00.000Z',
        actorId: null,
        actorName: null,
        message: 'File',
        metadata: null,
        attachments: null,
      },
    ];

    const filtered = filterActivityEvents(events, ['comment', 'attachment']);
    expect(filtered.map((event) => event.id)).toEqual(['one', 'three']);
  });
});

describe('sortActivityEvents', () => {
  it('orders events in reverse chronological order', () => {
    const events: ActivityEvent[] = [
      {
        id: 'older',
        entityId: '1',
        entityType: 'booking',
        rawType: 'comment',
        category: 'comment',
        createdAt: '2024-01-01T10:00:00.000Z',
        actorId: null,
        actorName: null,
        message: 'A',
        metadata: null,
        attachments: null,
      },
      {
        id: 'newer',
        entityId: '1',
        entityType: 'booking',
        rawType: 'status_change',
        category: 'status_change',
        createdAt: '2024-01-03T10:00:00.000Z',
        actorId: null,
        actorName: null,
        message: 'B',
        metadata: null,
        attachments: null,
      },
      {
        id: 'middle',
        entityId: '1',
        entityType: 'booking',
        rawType: 'attachment',
        category: 'attachment',
        createdAt: '2024-01-02T10:00:00.000Z',
        actorId: null,
        actorName: null,
        message: 'C',
        metadata: null,
        attachments: null,
      },
    ];

    const sorted = sortActivityEvents(events);
    expect(sorted.map((event) => event.id)).toEqual(['newer', 'middle', 'older']);
  });
});
