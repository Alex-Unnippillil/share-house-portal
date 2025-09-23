import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';
import type { Database } from '@/lib/supabase';

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>;

export type MemberRole = Database['public']['Tables']['profiles']['Row']['role'];

export type MemberProfile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'email' | 'full_name' | 'role' | 'unit_id' | 'rent_share'
>;

function handlePostgrestError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export async function fetchMemberRole(
  client: SupabaseClientLike,
  memberId: string
): Promise<MemberRole | null> {
  const { data, error } = await client
    .from('profiles')
    .select('role')
    .eq('id', memberId)
    .maybeSingle();

  handlePostgrestError(error, 'Failed to load member role');

  return (data?.role as MemberRole | null | undefined) ?? null;
}

export async function fetchMemberProfile(
  client: SupabaseClientLike,
  memberId: string
): Promise<MemberProfile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, email, full_name, role, unit_id, rent_share')
    .eq('id', memberId)
    .maybeSingle();

  handlePostgrestError(error, 'Failed to load member profile');

  if (!data) {
    return null;
  }

  return data as MemberProfile;
}

interface FetchMembersByUnitOptions {
  excludeUserId?: string;
  roles?: MemberRole[];
}

export async function fetchMembersByUnit(
  client: SupabaseClientLike,
  unitId: string,
  options: FetchMembersByUnitOptions = {}
): Promise<MemberProfile[]> {
  let query = client
    .from('profiles')
    .select('id, email, full_name, role, unit_id, rent_share')
    .eq('unit_id', unitId);

  if (options.excludeUserId) {
    query = query.neq('id', options.excludeUserId);
  }

  if (options.roles?.length) {
    query = query.in('role', options.roles);
  }

  const { data, error } = await query;

  handlePostgrestError(error, 'Failed to load members for unit');

  return (data as MemberProfile[] | null | undefined) ?? [];
}
