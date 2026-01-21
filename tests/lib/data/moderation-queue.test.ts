import { describe, expect, it, vi } from 'vitest';

import { fetchModerationQueue } from '@/lib/data/moderation-queue';

type QueryResult<T> = { data: T; error: { message: string } | null };

type QueryBuilder<T> = {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  then: (onFulfilled: (value: QueryResult<T>) => unknown) => Promise<unknown>;
};

function createQueryBuilder<T>(result: QueryResult<T>): QueryBuilder<T> {
  const builder: Partial<QueryBuilder<T>> & {
    select: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
  } = {
    select: vi.fn().mockImplementation(() => builder),
    order: vi.fn().mockImplementation(() => builder),
    in: vi.fn().mockImplementation(() => builder),
    limit: vi.fn().mockImplementation(() => builder),
  };

  (builder as QueryBuilder<T>).then = (onFulfilled) =>
    Promise.resolve(onFulfilled(result));

  return builder as QueryBuilder<T>;
}

function createSupabaseStub<T>(builder: QueryBuilder<T>) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe('messaging_moderation_queue');
      return builder;
    }),
  };
}

describe('fetchModerationQueue', () => {
  it('maps Supabase records into queue entries', async () => {
    const payload = [
      {
        id: 'queue-1',
        thread_id: 'thread-1',
        severity: 'high',
        status: 'needs_review',
        flags: 3,
        last_activity: '2024-06-10T12:00:00.000Z',
        flagged_by_display: 'Aisha • Roommate',
        flagged_reason: 'Repeated quiet-hour violations.',
        next_step: 'Escalate to onsite staff if unresolved today.',
        watchers: ['Night concierge', 'Property care team'],
        thread: {
          id: 'thread-1',
          subject: 'Quiet hours disruption',
          summary: 'Roommates reported late-night noise three times this week.',
          category: 'Community',
          unit_label: 'Unit 3B',
        },
        messages: [
          {
            id: 'msg-1',
            sender_name: 'Aisha',
            sent_at: '2024-06-10T11:50:00.000Z',
            content: 'Could we keep things quieter after 11pm?',
            is_flagged: true,
          },
          {
            id: 'msg-2',
            sender_name: 'Jordan',
            sent_at: '2024-06-10T11:52:00.000Z',
            content: 'Sorry! Volume is down and guests are aware.',
            is_flagged: null,
          },
        ],
        workflow: [
          {
            id: 'wf-1',
            occurred_at: '2024-06-10T11:55:00.000Z',
            description: 'Auto-moderation flagged the thread for policy review.',
          },
        ],
      },
      {
        id: 'queue-2',
        thread_id: 'thread-2',
        severity: 'medium',
        status: 'monitoring',
        flags: null,
        last_activity: null,
        flagged_by_display: 'Moderation bot',
        flagged_reason: null,
        next_step: null,
        watchers: null,
        thread: null,
        messages: null,
        workflow: null,
      },
    ];

    const builder = createQueryBuilder({ data: payload as any, error: null });
    const supabase = createSupabaseStub(builder);

    const [first, second] = await fetchModerationQueue(supabase as any);

    expect(first).toEqual({
      id: 'queue-1',
      threadId: 'thread-1',
      subject: 'Quiet hours disruption',
      summary: 'Roommates reported late-night noise three times this week.',
      category: 'Community',
      unitLabel: 'Unit 3B',
      severity: 'high',
      status: 'needs_review',
      flags: 3,
      lastActivity: '2024-06-10T12:00:00.000Z',
      flaggedBy: 'Aisha • Roommate',
      flaggedReason: 'Repeated quiet-hour violations.',
      nextStep: 'Escalate to onsite staff if unresolved today.',
      watchers: ['Night concierge', 'Property care team'],
      messages: [
        {
          id: 'msg-1',
          senderName: 'Aisha',
          sentAt: '2024-06-10T11:50:00.000Z',
          content: 'Could we keep things quieter after 11pm?',
          isFlagged: true,
        },
        {
          id: 'msg-2',
          senderName: 'Jordan',
          sentAt: '2024-06-10T11:52:00.000Z',
          content: 'Sorry! Volume is down and guests are aware.',
          isFlagged: false,
        },
      ],
      workflow: [
        {
          id: 'wf-1',
          occurredAt: '2024-06-10T11:55:00.000Z',
          description: 'Auto-moderation flagged the thread for policy review.',
        },
      ],
    });

    expect(second).toEqual({
      id: 'queue-2',
      threadId: 'thread-2',
      subject: 'Untitled thread',
      summary: null,
      category: null,
      unitLabel: null,
      severity: 'medium',
      status: 'monitoring',
      flags: 0,
      lastActivity: null,
      flaggedBy: 'Moderation bot',
      flaggedReason: null,
      nextStep: null,
      watchers: [],
      messages: [],
      workflow: [],
    });

    expect(builder.select).toHaveBeenCalled();
    expect(builder.order).toHaveBeenNthCalledWith(1, 'last_activity', { ascending: false, nullsLast: true });
  });

  it('applies filters and limits when provided', async () => {
    const builder = createQueryBuilder({ data: [] as any, error: null });
    const supabase = createSupabaseStub(builder);

    await fetchModerationQueue(supabase as any, {
      statuses: ['needs_review', 'monitoring'],
      severity: ['high'],
      limit: 5,
    });

    expect(builder.in).toHaveBeenNthCalledWith(1, 'status', ['needs_review', 'monitoring']);
    expect(builder.in).toHaveBeenNthCalledWith(2, 'severity', ['high']);
    expect(builder.limit).toHaveBeenCalledWith(5);
  });

  it('throws when Supabase returns an error', async () => {
    const builder = createQueryBuilder({ data: null as any, error: { message: 'queue failed' } });
    const supabase = createSupabaseStub(builder);

    await expect(fetchModerationQueue(supabase as any)).rejects.toThrow(
      /Failed to fetch moderation queue: queue failed/
    );
  });
});
