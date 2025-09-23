import type { PostgrestError } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase';
import type {
  FavoriteEntityType,
  FavoriteMetadata,
  FavoritePanelItem,
  UserFavorite,
} from '@/types/favorites';
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>;

type FavoriteRow = Database['public']['Tables']['user_favorites']['Row'];

const ENTITY_LABELS: Record<FavoriteEntityType, string> = {
  document: 'Document',
  thread: 'Thread',
  booking: 'Booking',
};

function handlePostgrestError(error: PostgrestError | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function parseMetadata(value: unknown): FavoriteMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { title: 'Untitled' };
  }

  const record = value as Record<string, unknown>;
  const title = typeof record.title === 'string' && record.title.trim().length > 0
    ? record.title
    : 'Untitled';

  const metadata: FavoriteMetadata = { title };

  if (typeof record.subtitle === 'string' && record.subtitle.trim()) {
    metadata.subtitle = record.subtitle;
  }

  if (typeof record.description === 'string' && record.description.trim()) {
    metadata.description = record.description;
  }

  if (typeof record.href === 'string' && record.href.trim()) {
    metadata.href = record.href;
  }

  if (typeof record.badge === 'string' && record.badge.trim()) {
    metadata.badge = record.badge;
  }

  return metadata;
}

function serializeMetadata(metadata: FavoriteMetadata): Record<string, string> {
  const payload: Record<string, string> = {
    title: metadata.title?.trim().length ? metadata.title : 'Untitled',
  };

  if (metadata.subtitle?.trim()) {
    payload.subtitle = metadata.subtitle;
  }

  if (metadata.description?.trim()) {
    payload.description = metadata.description;
  }

  if (metadata.href?.trim()) {
    payload.href = metadata.href;
  }

  if (metadata.badge?.trim()) {
    payload.badge = metadata.badge;
  }

  return payload;
}

function mapFavoriteRow(row: FavoriteRow): UserFavorite {
  return {
    id: row.id,
    profileId: row.profile_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    position: typeof row.position === 'number' ? row.position : 0,
    metadata: parseMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchUserFavorites(
  client: SupabaseClientLike,
  userId: string,
): Promise<UserFavorite[]> {
  const query = (client as any)
    .from('user_favorites')
    .select('id, profile_id, entity_type, entity_id, position, metadata, created_at, updated_at')
    .eq('profile_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  const { data, error } = await query;
  handlePostgrestError(error, 'Failed to load favorites');

  const rows = (data ?? []) as FavoriteRow[];

  return rows
    .slice()
    .sort((a, b) => {
      if (typeof a.position === 'number' && typeof b.position === 'number' && a.position !== b.position) {
        return a.position - b.position;
      }

      const createdAtA = a.created_at ?? '';
      const createdAtB = b.created_at ?? '';

      return createdAtA.localeCompare(createdAtB);
    })
    .map((row) => mapFavoriteRow(row));
}

type UpsertFavoriteParams = {
  client: SupabaseClientLike;
  userId: string;
  entityType: FavoriteEntityType;
  entityId: string;
  metadata: FavoriteMetadata;
};

export async function upsertFavoriteRecord({
  client,
  userId,
  entityType,
  entityId,
  metadata,
}: UpsertFavoriteParams): Promise<void> {
  const sanitizedMetadata = serializeMetadata(metadata);
  const timestamp = new Date().toISOString();

  const existingResponse = await (client as any)
    .from('user_favorites')
    .select('id, position')
    .eq('profile_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .maybeSingle();

  handlePostgrestError(existingResponse.error, 'Failed to check existing favorite');

  const existing = existingResponse.data as Pick<FavoriteRow, 'id' | 'position'> | null;

  if (existing) {
    const { error: updateError } = await (client as any)
      .from('user_favorites')
      .update({
        metadata: sanitizedMetadata,
        updated_at: timestamp,
      })
      .eq('id', existing.id);

    handlePostgrestError(updateError, 'Failed to update favorite');
    return;
  }

  const lastPositionResponse = await (client as any)
    .from('user_favorites')
    .select('position')
    .eq('profile_id', userId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  handlePostgrestError(lastPositionResponse.error, 'Failed to determine next favorite position');

  const nextPosition =
    typeof lastPositionResponse.data?.position === 'number'
      ? lastPositionResponse.data.position + 1
      : 0;

  const { error: insertError } = await (client as any)
    .from('user_favorites')
    .insert({
      profile_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      position: nextPosition,
      metadata: sanitizedMetadata,
      updated_at: timestamp,
    });

  handlePostgrestError(insertError, 'Failed to create favorite');
}

type RemoveFavoriteParams = {
  client: SupabaseClientLike;
  userId: string;
  entityType: FavoriteEntityType;
  entityId: string;
};

export async function removeFavoriteRecord({
  client,
  userId,
  entityType,
  entityId,
}: RemoveFavoriteParams): Promise<void> {
  const { error } = await (client as any)
    .from('user_favorites')
    .delete()
    .eq('profile_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  handlePostgrestError(error, 'Failed to remove favorite');
}

export function buildFavoritePanelItems(favorites: UserFavorite[]): FavoritePanelItem[] {
  return favorites
    .slice()
    .sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }

      const createdAtA = a.createdAt ?? '';
      const createdAtB = b.createdAt ?? '';

      return createdAtA.localeCompare(createdAtB);
    })
    .map((favorite) => ({
      id: favorite.id,
      entityType: favorite.entityType,
      entityId: favorite.entityId,
      title: favorite.metadata.title,
      subtitle: favorite.metadata.subtitle,
      description: favorite.metadata.description,
      href: favorite.metadata.href,
      badge: favorite.metadata.badge ?? ENTITY_LABELS[favorite.entityType],
    }));
}
