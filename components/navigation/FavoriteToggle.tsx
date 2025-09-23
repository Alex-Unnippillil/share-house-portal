"use client";

import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';

import type { FavoriteEntityType, FavoriteMetadata } from '@/types/favorites';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/components/navigation/FavoritesProvider';

interface FavoriteToggleProps {
  entityType: FavoriteEntityType;
  entityId: string;
  metadata: FavoriteMetadata;
  label?: string;
  iconOnly?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'secondary' | 'ghost' | 'outline';
  className?: string;
}

export function FavoriteToggle({
  entityType,
  entityId,
  metadata,
  label,
  iconOnly = true,
  size,
  variant,
  className,
}: FavoriteToggleProps) {
  const { isFavorite, pinFavorite, unpinFavorite } = useFavorites();
  const [pending, setPending] = useState(false);

  const favorite = isFavorite(entityType, entityId);
  const buttonSize = iconOnly ? 'icon' : size ?? 'sm';
  const buttonVariant = variant ?? (favorite ? 'secondary' : 'ghost');
  const ariaLabel = label ?? (favorite ? 'Remove from favorites' : 'Add to favorites');

  return (
    <Button
      type="button"
      variant={buttonVariant}
      size={buttonSize}
      className={className}
      aria-pressed={favorite}
      aria-label={ariaLabel}
      disabled={pending}
      onClick={async () => {
        if (pending) {
          return;
        }

        setPending(true);
        try {
          if (favorite) {
            await unpinFavorite(entityType, entityId);
          } else {
            await pinFavorite({ entityType, entityId, metadata });
          }
        } catch (toggleError) {
          console.error('Failed to toggle favorite state', toggleError);
        } finally {
          setPending(false);
        }
      }}
    >
      {favorite ? (
        <BookmarkCheck className="h-4 w-4" aria-hidden />
      ) : (
        <Bookmark className="h-4 w-4" aria-hidden />
      )}
      {!iconOnly ? <span className="ml-2 text-sm">{favorite ? 'Pinned' : 'Pin'}</span> : null}
    </Button>
  );
}
