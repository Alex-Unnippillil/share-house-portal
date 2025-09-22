import { revalidateTag } from 'next/cache';

import { invalidateCacheByTag, invalidateCacheByTags } from './store';

export const CACHE_TAGS = {
  documents: {
    list: 'documents:list',
    stats: 'documents:stats',
    detail: (id: string) => `documents:detail:${id}`,
  },
  payments: {
    list: 'payments:list',
    summary: 'payments:summary',
  },
  bookings: {
    list: 'bookings:list',
    summary: 'bookings:summary',
  },
} as const;

export const CACHE_TTL = {
  documentsList: 60,
  documentsStats: 120,
  paymentsSummary: 90,
  bookingsList: 45,
} as const;

type TableTagMap = Record<string, string[]>;

const TABLE_TAG_MAP: TableTagMap = {
  documents: [CACHE_TAGS.documents.list, CACHE_TAGS.documents.stats],
  document_signatures: [CACHE_TAGS.documents.list, CACHE_TAGS.documents.stats],
  document_access_logs: [CACHE_TAGS.documents.list],
  leases: [CACHE_TAGS.documents.list, CACHE_TAGS.documents.stats],
  rent_payments: [CACHE_TAGS.payments.list, CACHE_TAGS.payments.summary],
  subscriptions: [CACHE_TAGS.payments.list, CACHE_TAGS.payments.summary],
  bookings: [CACHE_TAGS.bookings.list, CACHE_TAGS.bookings.summary],
  amenity_bookings: [CACHE_TAGS.bookings.list, CACHE_TAGS.bookings.summary],
};

export type SupabaseTableWithTags = keyof typeof TABLE_TAG_MAP;

export function getTagsForTables(...tables: SupabaseTableWithTags[]): string[] {
  const tags = new Set<string>();
  for (const table of tables) {
    const tableTags = TABLE_TAG_MAP[table] ?? [];
    for (const tag of tableTags) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
}

export function revalidateCacheTags(...tags: string[]) {
  const uniqueTags = Array.from(new Set(tags));
  for (const tag of uniqueTags) {
    invalidateCacheByTag(tag);
    revalidateTag(tag);
  }
}

export function revalidateTables(...tables: SupabaseTableWithTags[]) {
  const tags = getTagsForTables(...tables);
  if (!tags.length) return;
  revalidateCacheTags(...tags);
}

export function purgeTablesFromCache(...tables: SupabaseTableWithTags[]) {
  const tags = getTagsForTables(...tables);
  if (!tags.length) return;
  invalidateCacheByTags(tags);
}
