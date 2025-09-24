'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { fetchMemberRole } from '@/lib/data/members';
import {
  isPermissionId,
  normalizePermissionIds,
  updateRolePermissions,
} from '@/lib/data/permissions';
import { createSupbaseServerClient } from '@/utils/supaone';
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';

const updatePayloadSchema = z.object({
  roleId: z.string().uuid('A valid role identifier is required.'),
  permissions: z.array(z.string()).default([]),
});

export interface UpdateRolePermissionsResult {
  success: boolean;
  error?: string;
  permissions?: string[];
}

export async function updateRolePermissionsAction(
  input: z.infer<typeof updatePayloadSchema>
): Promise<UpdateRolePermissionsResult> {
  const parseResult = updatePayloadSchema.safeParse(input);
  if (!parseResult.success) {
    const message = parseResult.error.issues[0]?.message ?? 'Invalid request payload.';
    return { success: false, error: message };
  }

  const invalidPermissions = parseResult.data.permissions.filter((permission) => !isPermissionId(permission));
  if (invalidPermissions.length > 0) {
    return {
      success: false,
      error: `Unknown permission: ${invalidPermissions[0]}`,
    };
  }

  const supabase = await createSupbaseServerClient();
  const typedSupabase = supabase as unknown as TypedSupabaseClient;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'You must be signed in to manage role permissions.' };
  }

  let role: Awaited<ReturnType<typeof fetchMemberRole>>;
  try {
    role = await fetchMemberRole(typedSupabase, user.id);
  } catch (error) {
    console.error('Failed to resolve actor role for permission update', error);
    return { success: false, error: 'Unable to verify your role assignment.' };
  }

  if (role !== 'admin') {
    return {
      success: false,
      error: 'You do not have permission to update role assignments.',
    };
  }

  const normalizedPermissions = normalizePermissionIds(parseResult.data.permissions);

  try {
    await updateRolePermissions(typedSupabase, parseResult.data.roleId, normalizedPermissions);
  } catch (error) {
    console.error('Failed to update role permissions', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update permissions.',
    };
  }

  revalidatePath('/dashboard/roles');

  return { success: true, permissions: normalizedPermissions };
}
