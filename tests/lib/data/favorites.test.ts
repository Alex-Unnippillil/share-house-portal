import { describe, expect, it, vi } from 'vitest';

import {
  buildFavoritePanelItems,
  fetchUserFavorites,
  removeFavoriteRecord,
  upsertFavoriteRecord,
} from '@/lib/data/favorites';
import type { FavoriteMetadata } from '@/types/favorites';

function createQueryBuilder(result: any) {
  const builder: any = {};

  builder.select = vi.fn().mockImplementation(() => builder);
  builder.eq = vi.fn().mockImplementation(() => builder);
  builder.order = vi.fn().mockImplementation(() => builder);
  builder.limit = vi.fn().mockImplementation(() => builder);
  builder.maybeSingle = vi.fn().mockResolvedValue(result);
  builder.insert = vi.fn().mockResolvedValue(result);
  builder.update = vi.fn().mockImplementation(() => builder);
  builder.delete = vi.fn().mockImplementation(() => builder);
  builder.then = (onFulfilled: (value: any) => unknown) =>
    Promise.resolve(onFulfilled(result));

  return builder;
}

function createFromStub(...builders: any[]) {
  let index = 0;
  return vi.fn((table: string) => {
    expect(table).toBe('user_favorites');
    const builder = builders[index];
    index += 1;
    return builder;
  });
}

describe('fetchUserFavorites', () => {
  it('returns favorites ordered by position and created_at', async () => {
    const rows = [
      {
        id: 'fav-2',
        profile_id: 'user-1',
        entity_type: 'thread',
        entity_id: 'thread-b',
        position: 2,
        metadata: { title: 'Thread B' },
        created_at: '2024-05-01T00:00:00Z',
        updated_at: '2024-05-01T00:00:00Z',
      },
      {
        id: 'fav-1',
        profile_id: 'user-1',
        entity_type: 'document',
        entity_id: 'doc-a',
        position: 0,
        metadata: { title: 'Document A' },
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
      },
    ];
    const builder = createQueryBuilder({ data: rows, error: null });
    const supabase = { from: createFromStub(builder) } as any;

    const favorites = await fetchUserFavorites(supabase, 'user-1');

    expect(builder.select).toHaveBeenCalledWith(
      'id, profile_id, entity_type, entity_id, position, metadata, created_at, updated_at',
    );
    expect(builder.eq).toHaveBeenCalledWith('profile_id', 'user-1');
    expect(favorites).toHaveLength(2);
    expect(favorites[0].id).toBe('fav-1');
    expect(favorites[1].id).toBe('fav-2');
  });
});

describe('upsertFavoriteRecord', () => {
  const metadata: FavoriteMetadata = {
    title: 'Lease Agreement',
    subtitle: 'Lease • Signed',
    href: '/documents',
    badge: 'Document',
  };

  it('inserts new favorites with the next position', async () => {
    const existingBuilder = createQueryBuilder({ data: null, error: null });
    const positionBuilder = createQueryBuilder({ data: { position: 3 }, error: null });
    const insertBuilder = createQueryBuilder({ error: null });
    const supabase = {
      from: createFromStub(existingBuilder, positionBuilder, insertBuilder),
    } as any;

    await upsertFavoriteRecord({
      client: supabase,
      userId: 'user-1',
      entityType: 'document',
      entityId: 'doc-123',
      metadata,
    });

    expect(existingBuilder.select).toHaveBeenCalledWith('id, position');
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: 'user-1',
        entity_type: 'document',
        entity_id: 'doc-123',
        position: 4,
        metadata: expect.objectContaining({ title: 'Lease Agreement' }),
      }),
    );
  });

  it('updates existing favorites when already pinned', async () => {
    const existingBuilder = createQueryBuilder({ data: { id: 'fav-1', position: 0 }, error: null });
    const updateBuilder = createQueryBuilder({ error: null });
    const supabase = {
      from: createFromStub(existingBuilder, updateBuilder),
    } as any;

    await upsertFavoriteRecord({
      client: supabase,
      userId: 'user-1',
      entityType: 'document',
      entityId: 'doc-123',
      metadata,
    });

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ title: 'Lease Agreement' }) }),
    );
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'fav-1');
  });
});

describe('removeFavoriteRecord', () => {
  it('removes favorites for the provided entity', async () => {
    const deleteBuilder = createQueryBuilder({ error: null });
    const supabase = { from: createFromStub(deleteBuilder) } as any;

    await removeFavoriteRecord({
      client: supabase,
      userId: 'user-1',
      entityType: 'thread',
      entityId: 'thread-9',
    });

    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith('entity_id', 'thread-9');
  });
});

describe('buildFavoritePanelItems', () => {
  it('maps favorites into panel items sorted by position', () => {
    const items = buildFavoritePanelItems([
      {
        id: 'fav-1',
        profileId: 'user-1',
        entityType: 'document',
        entityId: 'doc-1',
        position: 2,
        metadata: { title: 'Lease', badge: 'Document' },
        createdAt: '2024-04-02T00:00:00Z',
        updatedAt: '2024-04-02T00:00:00Z',
      },
      {
        id: 'fav-2',
        profileId: 'user-1',
        entityType: 'thread',
        entityId: 'thread-1',
        position: 1,
        metadata: { title: 'Chore rota', badge: 'Thread' },
        createdAt: '2024-04-01T00:00:00Z',
        updatedAt: '2024-04-01T00:00:00Z',
      },
    ]);

    expect(items.map((item) => item.id)).toEqual(['fav-2', 'fav-1']);
    expect(items[0].badge).toBe('Thread');
    expect(items[1].badge).toBe('Document');
  });
});
