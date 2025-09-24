import { redirect } from 'next/navigation';

import { fetchMemberRole } from '@/lib/data/members';
import { fetchRolesWithPermissions, getPermissionCatalog } from '@/lib/data/permissions';
import { createSupbaseServerClient } from '@/utils/supaone';
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';

import RolePermissionManager from './components/RolePermissionManager';

export default async function RolesPage() {
  const supabase = await createSupbaseServerClient();
  const typedSupabase = supabase as unknown as TypedSupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/auth');
  }

  let memberRole: Awaited<ReturnType<typeof fetchMemberRole>>;
  try {
    memberRole = await fetchMemberRole(typedSupabase, user.id);
  } catch (error) {
    console.error('Failed to resolve member role for permissions dashboard', error);
    return redirect('/dashboard');
  }

  if (memberRole !== 'admin') {
    return redirect('/dashboard');
  }

  let roles = [];
  try {
    roles = await fetchRolesWithPermissions(typedSupabase);
  } catch (error) {
    console.error('Failed to load role definitions', error);
  }

  const permissionCatalog = getPermissionCatalog();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Roles &amp; Permissions</h1>
        <p className="text-muted-foreground">
          Configure the fine-grained permissions that each role grants across the Roomsily platform.
        </p>
      </header>
      <RolePermissionManager roles={roles} permissionCatalog={permissionCatalog} />
    </div>
  );
}
