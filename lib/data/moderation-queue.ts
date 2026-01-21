import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';
import type { Database } from '@/lib/supabase';

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>;

type QueueRow = Database['public']['Tables']['messaging_moderation_queue']['Row'];
type ThreadRow = Database['public']['Tables']['messaging_threads']['Row'];
type MessageRow = Database['public']['Tables']['messaging_moderation_messages']['Row'];
type EventRow = Database['public']['Tables']['messaging_moderation_events']['Row'];

export type ModerationQueueStatus = QueueRow['status'];
export type ModerationQueueSeverity = QueueRow['severity'];

export type ModerationQueueMessage = {
  id: string;
  senderName: string;
  sentAt: string;
  content: string;
  isFlagged: boolean;
};

export type ModerationWorkflowEvent = {
  id: string;
  occurredAt: string;
  description: string;
};

export type ModerationQueueEntry = {
  id: string;
  threadId: string;
  subject: string;
  summary: string | null;
  category: string | null;
  unitLabel: string | null;
  severity: ModerationQueueSeverity;
  status: ModerationQueueStatus;
  flags: number;
  lastActivity: string | null;
  flaggedBy: string;
  flaggedReason: string | null;
  nextStep: string | null;
  watchers: string[];
  messages: ModerationQueueMessage[];
  workflow: ModerationWorkflowEvent[];
};

type FetchModerationQueueOptions = {
  statuses?: ModerationQueueStatus[];
  severity?: ModerationQueueSeverity[];
  limit?: number;
};

const SELECT_FIELDS = `
  id,
  thread_id,
  severity,
  status,
  flags,
  last_activity,
  flagged_by_display,
  flagged_reason,
  next_step,
  watchers,
  thread:messaging_threads (
    id,
    subject,
    summary,
    category,
    unit_label
  ),
  messages:messaging_moderation_messages (
    id,
    sender_name,
    sent_at,
    content,
    is_flagged
  ),
  workflow:messaging_moderation_events (
    id,
    occurred_at,
    description
  )
`;

function handlePostgrestError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function mapMessages(messages: MessageRow[] | null | undefined): ModerationQueueMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.map((message) => ({
    id: message.id,
    senderName: message.sender_name,
    sentAt: message.sent_at,
    content: message.content,
    isFlagged: Boolean(message.is_flagged),
  }));
}

function mapWorkflow(events: EventRow[] | null | undefined): ModerationWorkflowEvent[] {
  if (!Array.isArray(events)) {
    return [];
  }

  return events.map((event) => ({
    id: event.id,
    occurredAt: event.occurred_at,
    description: event.description,
  }));
}

function mapQueueRow(row: QueueRow & {
  thread?: ThreadRow | null;
  messages?: MessageRow[] | null;
  workflow?: EventRow[] | null;
}): ModerationQueueEntry {
  const thread = row.thread ?? null;
  const watchers = Array.isArray(row.watchers)
    ? row.watchers.filter((watcher): watcher is string => typeof watcher === 'string')
    : [];

  return {
    id: row.id,
    threadId: thread?.id ?? row.thread_id,
    subject: thread?.subject ?? 'Untitled thread',
    summary: thread?.summary ?? null,
    category: thread?.category ?? null,
    unitLabel: thread?.unit_label ?? null,
    severity: row.severity,
    status: row.status,
    flags: typeof row.flags === 'number' ? row.flags : 0,
    lastActivity: row.last_activity ?? null,
    flaggedBy: row.flagged_by_display,
    flaggedReason: row.flagged_reason ?? null,
    nextStep: row.next_step ?? null,
    watchers,
    messages: mapMessages(row.messages),
    workflow: mapWorkflow(row.workflow),
  };
}

export async function fetchModerationQueue(
  client: SupabaseClientLike,
  options: FetchModerationQueueOptions = {}
): Promise<ModerationQueueEntry[]> {
  let query = (client as any)
    .from('messaging_moderation_queue')
    .select(SELECT_FIELDS)
    .order('last_activity', { ascending: false, nullsLast: true })
    .order('sent_at', { foreignTable: 'messaging_moderation_messages', ascending: true })
    .order('occurred_at', { foreignTable: 'messaging_moderation_events', ascending: true });

  if (options.statuses?.length) {
    query = query.in('status', options.statuses);
  }

  if (options.severity?.length) {
    query = query.in('severity', options.severity);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  handlePostgrestError(error, 'Failed to fetch moderation queue');

  return (data as (QueueRow & {
    thread?: ThreadRow | null;
    messages?: MessageRow[] | null;
    workflow?: EventRow[] | null;
  })[] | null | undefined)?.map(mapQueueRow) ?? [];
}
