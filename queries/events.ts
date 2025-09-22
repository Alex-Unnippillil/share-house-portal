import { createServiceRoleClient } from '@/lib/supabase-service-role';
import type { Database } from '@/lib/supabase';
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';

export type EventEntityType = 'payment' | 'booking' | 'chore';

export type EventAction =
  | 'payment.receipt_sent'
  | 'booking.created'
  | 'booking.rescheduled'
  | 'booking.cancelled'
  | 'chore.assigned'
  | 'chore.completed'
  | 'chore.skipped';

export type EventRow = Database['public']['Tables']['events']['Row'];
export type EventInsert = Database['public']['Tables']['events']['Insert'];

export function getServiceRoleClient(): TypedSupabaseClient {
  return createServiceRoleClient();
}

export async function insertEvent(
  client: TypedSupabaseClient,
  event: EventInsert,
): Promise<EventRow> {
  const { data, error } = await client.from('events').insert(event).select().single();

  if (error) {
    throw new Error(`Failed to insert event: ${error.message}`);
  }

  return data;
}

export async function getEventsForHousehold(
  client: TypedSupabaseClient,
  householdId: string,
  options: {
    limit?: number;
    entityType?: EventEntityType;
    since?: string;
  } = {},
): Promise<EventRow[]> {
  const { limit = 50, entityType, since } = options;

  let query = client
    .from('events')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  if (since) {
    query = query.gte('created_at', since);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`);
  }

  return data ?? [];
}

