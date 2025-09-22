'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';

import { createClient } from '@/utils/supa-server-actions';
import {
  buildPaginationMetadata,
  normalizePaginationParams,
  paginationParamsSchema,
} from '@/utils/pagination';
import type {
  MessageListParams,
  PaginatedMessagesResponse,
} from '@/types/messages';

interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const messageFiltersSchema = z.object({
  type: z.array(z.enum(['info', 'success', 'warning', 'error'])).optional(),
  read: z.boolean().optional(),
  userId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});

const messagesQuerySchema = z.object({
  filters: messageFiltersSchema.optional(),
  pagination: paginationParamsSchema.optional(),
});

const DEFAULT_MESSAGE_PAGE_SIZE = 10;

const escapeIlike = (value: string) =>
  value.replace(/[\\%_]/g, match => `\\${match}`);

export async function getMessagesAction(
  params?: MessageListParams
): Promise<ActionResult<PaginatedMessagesResponse>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'You must be logged in to view messages.' };
    }

    const parsedParams = messagesQuerySchema.parse(params ?? {});
    const filters = parsedParams.filters ?? {};
    const paginationInput = parsedParams.pagination;

    let paginationConfig;
    try {
      const fallbackLimit = paginationInput?.limit ?? DEFAULT_MESSAGE_PAGE_SIZE;
      paginationConfig = normalizePaginationParams(paginationInput, fallbackLimit);
    } catch (error) {
      console.error('Invalid pagination cursor for messages:', error);
      return { success: false, error: 'Invalid pagination cursor provided.' };
    }

    const { limit, offset, pageOverride } = paginationConfig;
    const rangeEnd = Math.max(offset + limit - 1, offset);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let query = (supabase as any)
      .from('notifications')
      .select(
        `id, user_id, title, message, type, action_url, metadata, read, created_at, updated_at`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    const isManager = profile?.role === 'property_manager' || profile?.role === 'admin';

    if (!isManager) {
      query = query.eq('user_id', user.id);
    } else if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.type?.length) {
      query = query.in('type', filters.type);
    }

    if (filters.read !== undefined) {
      query = query.eq('read', filters.read);
    }

    if (filters.search) {
      const sanitized = escapeIlike(filters.search.trim());
      if (sanitized.length > 0) {
        const pattern = `%${sanitized}%`;
        query = query.or(
          `title.ilike.${pattern},message.ilike.${pattern}`
        );
      }
    }

    const { data: rows, error, count } = await query.range(offset, rangeEnd);

    if (error) {
      console.error('Error fetching messages:', error);
      return { success: false, error: 'Failed to fetch messages.' };
    }

    const items = (rows || []).map(row => ({
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      body: row.message,
      type: row.type,
      action_url: row.action_url,
      metadata: row.metadata ?? {},
      read: row.read,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const pagination = buildPaginationMetadata({
      total: count ?? 0,
      limit,
      offset,
      itemCount: items.length,
      pageOverride,
    });

    return {
      success: true,
      data: {
        items,
        pagination,
        filters,
      },
    };
  } catch (error) {
    console.error('Unexpected error in getMessagesAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    };
  }
}
