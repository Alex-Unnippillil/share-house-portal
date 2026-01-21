import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';

export type ActivityEntityType = 'document' | 'booking' | 'maintenance';
export type ActivityCategory = 'comment' | 'status_change' | 'attachment';

export interface ActivityAttachment {
  label: string;
  url?: string | null;
}

export interface ActivityEvent {
  id: string;
  entityId: string;
  entityType: ActivityEntityType;
  category: ActivityCategory | null;
  rawType: string;
  createdAt: string;
  actorId: string | null;
  actorName: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  attachments: ActivityAttachment[] | null;
}

export interface ActivityFilter {
  types?: ActivityCategory[];
}

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>;

type ActivityRow = {
  id: string;
  created_at: string | null;
  event_type: string | null;
  actor_id: string | null;
  message?: string | null;
  description?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  attachments?: unknown;
};

type ActivityTableMetadata = {
  table: string;
  foreignKey: string;
  label: string;
};

const ACTIVITY_TABLES: Record<ActivityEntityType, ActivityTableMetadata> = {
  document: {
    table: 'document_events',
    foreignKey: 'document_id',
    label: 'document',
  },
  booking: {
    table: 'booking_events',
    foreignKey: 'booking_id',
    label: 'booking',
  },
  maintenance: {
    table: 'maintenance_events',
    foreignKey: 'request_id',
    label: 'maintenance',
  },
};

function normaliseAttachments(input: unknown): ActivityAttachment[] | null {
  if (!input) {
    return null;
  }

  const array = Array.isArray(input) ? input : [input];
  const attachments = array
    .map((item) => {
      if (typeof item === 'string') {
        return { label: item } satisfies ActivityAttachment;
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const labelCandidate =
        record.label ??
        record.name ??
        record.file_name ??
        record.filename ??
        record.title;

      const label = typeof labelCandidate === 'string' ? labelCandidate : null;
      const urlCandidate = record.url ?? record.href ?? record.link;
      const url = typeof urlCandidate === 'string' ? urlCandidate : null;

      if (!label) {
        return null;
      }

      return { label, url } satisfies ActivityAttachment;
    })
    .filter((value): value is ActivityAttachment => Boolean(value));

  return attachments.length > 0 ? attachments : null;
}

export function normaliseActivityCategory(value: unknown): ActivityCategory | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalised = value.trim().toLowerCase();
  switch (normalised) {
    case 'comment':
      return 'comment';
    case 'status_change':
    case 'status-change':
    case 'status':
      return 'status_change';
    case 'attachment':
    case 'attachments':
      return 'attachment';
    default:
      return null;
  }
}

function mapRowToEvent(
  row: ActivityRow,
  entityType: ActivityEntityType,
  entityId: string,
): ActivityEvent {
  const rawType = row.event_type ?? 'unknown';
  const category = normaliseActivityCategory(rawType);
  const metadataRecord =
    row.metadata && typeof row.metadata === 'object'
      ? (row.metadata as Record<string, unknown>)
      : null;

  const message =
    typeof row.message === 'string'
      ? row.message
      : typeof row.description === 'string'
        ? row.description
        : typeof row.note === 'string'
          ? row.note
          : metadataRecord && typeof metadataRecord['message'] === 'string'
            ? (metadataRecord['message'] as string)
            : metadataRecord && typeof metadataRecord['summary'] === 'string'
              ? (metadataRecord['summary'] as string)
              : null;

  const actorNameCandidate =
    metadataRecord && typeof metadataRecord['actor_name'] === 'string'
      ? (metadataRecord['actor_name'] as string)
      : null;
  const actorName =
    typeof actorNameCandidate === 'string' && actorNameCandidate.trim().length > 0
      ? actorNameCandidate
      : null;

  const attachments = normaliseAttachments(
    row.attachments ?? (metadataRecord ? metadataRecord['attachments'] : undefined),
  );

  return {
    id: row.id,
    entityId,
    entityType,
    rawType,
    category,
    createdAt: row.created_at ?? new Date().toISOString(),
    actorId: row.actor_id ?? null,
    actorName,
    message,
    metadata: metadataRecord,
    attachments,
  } satisfies ActivityEvent;
}

export function sortActivityEvents(events: ActivityEvent[]): ActivityEvent[] {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();

    if (Number.isNaN(dateA) && Number.isNaN(dateB)) {
      return 0;
    }

    if (Number.isNaN(dateA)) {
      return 1;
    }

    if (Number.isNaN(dateB)) {
      return -1;
    }

    return dateB - dateA;
  });
}

export function filterActivityEvents(
  events: ActivityEvent[],
  categories: ActivityCategory[] | undefined,
): ActivityEvent[] {
  if (!categories || categories.length === 0) {
    return events;
  }

  const set = new Set(categories.map((category) => normaliseActivityCategory(category)).filter(Boolean));

  if (set.size === 0) {
    return events;
  }

  return events.filter((event) => {
    if (!event.category) {
      return true;
    }

    return set.has(event.category);
  });
}

function handleSupabaseError(error: { message: string } | null, label: string) {
  if (error) {
    throw new Error(`Failed to fetch ${label} activity: ${error.message}`);
  }
}

interface FetchActivityParams {
  client: SupabaseClientLike;
  entityType: ActivityEntityType;
  entityId: string;
  filters?: ActivityFilter;
}

export async function fetchActivityEvents({
  client,
  entityType,
  entityId,
  filters,
}: FetchActivityParams): Promise<ActivityEvent[]> {
  const tableMetadata = ACTIVITY_TABLES[entityType];
  let query = (client as any)
    .from(tableMetadata.table)
    .select('id, created_at, event_type, actor_id, message, description, note, metadata, attachments')
    .eq(tableMetadata.foreignKey, entityId)
    .order('created_at', { ascending: false });

  if (filters?.types && filters.types.length > 0) {
    query = query.in('event_type', filters.types);
  }

  const { data, error } = await query;
  handleSupabaseError(error, tableMetadata.label);

  const rows = Array.isArray(data) ? (data as ActivityRow[]) : [];
  const events = rows.map((row) => mapRowToEvent(row, entityType, entityId));

  return sortActivityEvents(events);
}

interface CreateActivityEventParams {
  client: SupabaseClientLike;
  entityType: ActivityEntityType;
  entityId: string;
  actorId: string;
  eventType: ActivityCategory;
  metadata?: Record<string, unknown>;
}

export async function recordActivityEvent({
  client,
  entityType,
  entityId,
  actorId,
  eventType,
  metadata,
}: CreateActivityEventParams): Promise<void> {
  const tableMetadata = ACTIVITY_TABLES[entityType];
  const payload = {
    [tableMetadata.foreignKey]: entityId,
    actor_id: actorId,
    event_type: eventType,
    metadata: metadata ?? {},
  };

  const { error } = await (client as any)
    .from(tableMetadata.table)
    .insert(payload);

  if (error) {
    throw new Error(`Failed to record ${tableMetadata.label} activity: ${error.message}`);
  }
}
