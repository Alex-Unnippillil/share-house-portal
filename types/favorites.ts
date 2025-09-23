import type { Database } from '@/lib/supabase';

type FavoriteRow = Database['public']['Tables']['user_favorites']['Row'];

export type FavoriteEntityType = FavoriteRow['entity_type'];

export interface FavoriteMetadata {
  title: string;
  subtitle?: string;
  description?: string;
  href?: string;
  badge?: string;
}

export interface UserFavorite {
  id: FavoriteRow['id'];
  profileId: FavoriteRow['profile_id'];
  entityType: FavoriteEntityType;
  entityId: FavoriteRow['entity_id'];
  position: FavoriteRow['position'];
  metadata: FavoriteMetadata;
  createdAt: FavoriteRow['created_at'];
  updatedAt: FavoriteRow['updated_at'];
}

export interface FavoritePanelItem {
  id: string;
  entityType: FavoriteEntityType;
  entityId: string;
  title: string;
  subtitle?: string;
  description?: string;
  href?: string;
  badge?: string;
}
