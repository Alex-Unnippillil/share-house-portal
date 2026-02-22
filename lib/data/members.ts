import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';
import type { Database } from '@/lib/supabase';

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>;

export type MemberRole = Database['public']['Tables']['profiles']['Row']['role'];

export type MemberProfile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'email' | 'full_name' | 'role' | 'unit_id'
>;

const ROLE_CACHE_TTL_MS = 30_000;
const roleCache = new Map<string, { value: MemberRole | null; expiresAt: number }>();

function handlePostgrestError(error: { message: string } | null, context: string): boolean {
  if (error) {
    console.warn(`${context}: ${error.message}`);
    return true;
  }

  return false;
}

export async function fetchMemberRole(
  client: SupabaseClientLike,
  memberId: string
): Promise<MemberRole | null> {
  const cached = roleCache.get(memberId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const { data, error } = await client
    .from('profiles')
    .select('role')
    .eq('id', memberId)
    .maybeSingle();

  if (handlePostgrestError(error, 'Failed to load member role')) {
    roleCache.delete(memberId);
    return null;
  }

  const role = (data?.role as MemberRole | null | undefined) ?? null;

  roleCache.set(memberId, {
    value: role,
    expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
  });

  return role;
}

export async function fetchMemberProfile(
  client: SupabaseClientLike,
  memberId: string
): Promise<MemberProfile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, email, full_name, role, unit_id')
    .eq('id', memberId)
    .maybeSingle();

  if (handlePostgrestError(error, 'Failed to load member profile')) {
    return null;
  }

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
    .select('id, email, full_name, role, unit_id')
    .eq('unit_id', unitId);

  if (options.excludeUserId) {
    query = query.neq('id', options.excludeUserId);
  }

  if (options.roles?.length) {
    query = query.in('role', options.roles);
  }

  const { data, error } = await query;

  if (handlePostgrestError(error, 'Failed to load members for unit')) {
    return [];
  }

  return (data as MemberProfile[] | null | undefined) ?? [];
}
