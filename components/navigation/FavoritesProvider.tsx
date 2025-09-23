"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { fetchUserFavorites, removeFavoriteRecord, upsertFavoriteRecord } from '@/lib/data/favorites';
import type { FavoriteEntityType, FavoriteMetadata, UserFavorite } from '@/types/favorites';
import { createClient } from '@/utils/supabase-browser';

interface FavoritesContextValue {
  favorites: UserFavorite[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  pinFavorite: (input: {
    entityType: FavoriteEntityType;
    entityId: string;
    metadata: FavoriteMetadata;
  }) => Promise<void>;
  unpinFavorite: (entityType: FavoriteEntityType, entityId: string) => Promise<void>;
  isFavorite: (entityType: FavoriteEntityType, entityId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [favorites, setFavorites] = useState<UserFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadFavoritesForUser = useCallback(
    async (uid: string) => {
      setLoading(true);
      try {
        const items = await fetchUserFavorites(supabase as any, uid);
        setFavorites(items);
        setError(null);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : 'Failed to load favorites';
        setError(message);
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    },
    [supabase],
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }
    await loadFavoritesForUser(userId);
  }, [loadFavoritesForUser, userId]);

  useEffect(() => {
    let active = true;
    let channel: RealtimeChannel | null = null;

    const resolveUserAndSubscribe = async () => {
      const { data, error: authError } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (authError || !data.user) {
        setUserId(null);
        setFavorites([]);
        if (authError) {
          setError(`Failed to resolve user session: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      const uid = data.user.id;
      setUserId(uid);
      await loadFavoritesForUser(uid);

      channel = supabase
        .channel(`user_favorites_${uid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_favorites',
            filter: `profile_id=eq.${uid}`,
          },
          () => {
            loadFavoritesForUser(uid).catch((subscriptionError) => {
              console.error('Failed to refresh favorites after realtime update', subscriptionError);
            });
          },
        )
        .subscribe();
    };

    resolveUserAndSubscribe();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadFavoritesForUser, supabase]);

  const pinFavorite = useCallback<
    FavoritesContextValue['pinFavorite']
  >(
    async ({ entityType, entityId, metadata }) => {
      if (!userId) {
        const message = 'You need to be signed in to pin favorites';
        setError(message);
        throw new Error(message);
      }

      try {
        await upsertFavoriteRecord({
          client: supabase as any,
          userId,
          entityType,
          entityId,
          metadata,
        });
        await loadFavoritesForUser(userId);
      } catch (mutationError) {
        const message =
          mutationError instanceof Error
            ? mutationError.message
            : 'Failed to save favorite';
        setError(message);
        throw mutationError instanceof Error ? mutationError : new Error(message);
      }
    },
    [loadFavoritesForUser, supabase, userId],
  );

  const unpinFavorite = useCallback<
    FavoritesContextValue['unpinFavorite']
  >(
    async (entityType, entityId) => {
      if (!userId) {
        const message = 'You need to be signed in to remove favorites';
        setError(message);
        throw new Error(message);
      }

      try {
        await removeFavoriteRecord({
          client: supabase as any,
          userId,
          entityType,
          entityId,
        });
        await loadFavoritesForUser(userId);
      } catch (mutationError) {
        const message =
          mutationError instanceof Error
            ? mutationError.message
            : 'Failed to remove favorite';
        setError(message);
        throw mutationError instanceof Error ? mutationError : new Error(message);
      }
    },
    [loadFavoritesForUser, supabase, userId],
  );

  const isFavorite = useCallback<
    FavoritesContextValue['isFavorite']
  >(
    (entityType, entityId) =>
      favorites.some(
        (item) => item.entityType === entityType && item.entityId === entityId,
      ),
    [favorites],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      loading,
      error,
      refresh,
      pinFavorite,
      unpinFavorite,
      isFavorite,
    }),
    [error, favorites, isFavorite, loading, pinFavorite, refresh, unpinFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
