"use client";

import { useMemo } from 'react';
import { Bookmark, BookmarkMinus } from 'lucide-react';

import { buildFavoritePanelItems } from '@/lib/data/favorites';
import { useFavorites } from '@/components/navigation/FavoritesProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import SmartLink from '@/components/navigation/SmartLink';

export default function FavoritesPanel() {
  const { favorites, loading, error, unpinFavorite } = useFavorites();

  const items = useMemo(() => buildFavoritePanelItems(favorites), [favorites]);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bookmark className="h-4 w-4" aria-hidden />
          <span>Pinned shortcuts</span>
        </div>
      </div>
      <div className="border-t">
        {loading ? (
          <div className="space-y-2 px-4 py-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded-md bg-muted/60"
                aria-hidden
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="space-y-1 px-4 py-6 text-sm text-muted-foreground">
            <p>No favorites yet.</p>
            <p>Use the pin icons across documents, threads, or bookings to keep them handy.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  {item.href ? (
                    <SmartLink
                      href={item.href}
                      intent="navigation"
                      className="block truncate text-sm font-medium text-foreground hover:underline"
                    >
                      {item.title}
                    </SmartLink>
                  ) : (
                    <span className="block truncate text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{item.badge}</Badge>
                    {item.subtitle ? <span className="truncate">{item.subtitle}</span> : null}
                  </div>
                  {item.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-1 text-muted-foreground"
                  onClick={async () => {
                    try {
                      await unpinFavorite(item.entityType, item.entityId);
                    } catch (unpinError) {
                      console.error('Failed to remove favorite', unpinError);
                    }
                  }}
                  aria-label={`Remove ${item.title} from favorites`}
                >
                  <BookmarkMinus className="h-4 w-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {error ? (
          <div className="border-t px-4 py-2 text-xs text-destructive">{error}</div>
        ) : null}
      </div>
    </div>
  );
}
