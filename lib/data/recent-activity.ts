import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';
import type { Database } from '@/lib/supabase';

const TABLE_NAME = 'user_recent_items';

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>;

type RecentActivityRow = Database['public']['Tables']['user_recent_items']['Row'];

type RecordRecentItemParams = {
  client: SupabaseClientLike;
  userId: string | null | undefined;
  entityType: string | null | undefined;
  entityId: string | null | undefined;
  label: string | null | undefined;
  lastVisitedRoute: string | null | undefined;
};

type FetchRecentActivityParams = {
  client: SupabaseClientLike;
  userId: string | null | undefined;
};

export type RecentActivityResult = {
  items: RecentActivityRow[];
  lastRoute: string | null;
};

function normalizeRoute(route: string | null | undefined): string | null {
  if (!route) {
    return null;
  }

  try {
    const trimmed = route.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith('/')) {
      return trimmed;
    }

    const url = new URL(trimmed, 'http://localhost');
    return url.pathname + url.search + url.hash;
  } catch (_error) {
    return null;
  }
}

export async function recordRecentItemVisit({
  client,
  userId,
  entityType,
  entityId,
  label,
  lastVisitedRoute,
}: RecordRecentItemParams): Promise<void> {
  const normalizedRoute = normalizeRoute(lastVisitedRoute);
  if (!client || !userId || !entityType || !entityId || !label || !normalizedRoute) {
    return;
  }

  const payload = {
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    label,
    last_visited_route: normalizedRoute,
    visited_at: new Date().toISOString(),
  };

  const { error } = await client
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: 'user_id,entity_type,entity_id' });

  if (error) {
    throw new Error(`Failed to record recent activity: ${error.message}`);
  }
}

export async function fetchRecentActivity({
  client,
  userId,
}: FetchRecentActivityParams): Promise<RecentActivityResult> {
  if (!client || !userId) {
    return { items: [], lastRoute: null };
  }

  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .order('visited_at', { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(`Failed to fetch recent activity: ${error.message}`);
  }

  const items = (data ?? []) as RecentActivityRow[];
  const lastRoute = items[0]?.last_visited_route ?? null;

  return {
    items,
    lastRoute,
  };
}
