import { describe, expect, it, vi } from 'vitest';

import {
  fetchRolesWithPermissions,
  getPermissionCatalog,
  normalizePermissionIds,
  updateRolePermissions,
} from '@/lib/data/permissions';

describe('permission catalog', () => {
  it('returns a defensive copy of the catalog', () => {
    const catalog = getPermissionCatalog();
    const originalCatalog = getPermissionCatalog();

    expect(catalog).toHaveLength(originalCatalog.length);
    catalog[0]?.groups[0]?.permissions?.splice(0, 1);

    expect(getPermissionCatalog()[0].groups[0].permissions.length).toBe(
      originalCatalog[0].groups[0].permissions.length
    );
  });

  it('normalizes and deduplicates permission identifiers', () => {
    const permissions = normalizePermissionIds([
      'payments.view_ledger',
      'payments.view_ledger',
      'unknown.permission',
      'documents.upload',
    ]);

    expect(permissions).toEqual(['payments.view_ledger', 'documents.upload']);
  });
});

describe('fetchRolesWithPermissions', () => {
  function createRolesBuilder(result: { data: any; error: any }) {
    const builder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue(result),
    };
    return builder;
  }

  function createRolePermissionsBuilder(result: { data: any; error: any }) {
    return {
      select: vi.fn().mockResolvedValue(result),
    };
  }

  it('merges roles with their permission assignments', async () => {
    const roles = [
      {
        id: 'role-1',
        slug: 'admin',
        name: 'Admin',
        description: 'All access',
        is_system: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'role-2',
        slug: 'manager',
        name: 'Property Manager',
        description: 'Limited',
        is_system: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ];

    const assignments = [
      { role_id: 'role-1', permission_id: 'payments.view_ledger' },
      { role_id: 'role-1', permission_id: 'documents.upload' },
      { role_id: 'role-1', permission_id: 'unknown.permission' },
      { role_id: 'role-2', permission_id: 'residents.view_roster' },
    ];

    const rolesBuilder = createRolesBuilder({ data: roles, error: null });
    const permissionsBuilder = createRolePermissionsBuilder({ data: assignments, error: null });

    const from = vi
      .fn()
      .mockImplementationOnce((table: string) => {
        expect(table).toBe('roles');
        return rolesBuilder;
      })
      .mockImplementationOnce((table: string) => {
        expect(table).toBe('role_permissions');
        return permissionsBuilder;
      });

    const client = { from } as any;

    const result = await fetchRolesWithPermissions(client);

    expect(from).toHaveBeenNthCalledWith(1, 'roles');
    expect(from).toHaveBeenNthCalledWith(2, 'role_permissions');
    expect(rolesBuilder.select).toHaveBeenCalledWith('id, slug, name, description, is_system, created_at, updated_at');
    expect(permissionsBuilder.select).toHaveBeenCalledWith('role_id, permission_id');

    expect(result).toHaveLength(2);
    expect(result[0]?.permission_ids.sort()).toEqual([
      'documents.upload',
      'payments.view_ledger',
    ]);
    expect(result[1]?.permission_ids).toEqual(['residents.view_roster']);
  });

  it('throws when role permissions query fails', async () => {
    const rolesBuilder = createRolesBuilder({
      data: [
        {
          id: 'role-1',
          slug: 'admin',
          name: 'Admin',
          description: null,
          is_system: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      error: null,
    });
    const permissionsBuilder = createRolePermissionsBuilder({
      data: null,
      error: { message: 'boom' },
    });

    const from = vi
      .fn()
      .mockImplementationOnce(() => rolesBuilder)
      .mockImplementationOnce(() => permissionsBuilder);

    const client = { from } as any;

    await expect(fetchRolesWithPermissions(client)).rejects.toThrow(
      /Failed to load role permissions: boom/
    );
  });
});

describe('updateRolePermissions', () => {
  it('inserts and deletes permissions based on desired state', async () => {
    const selectEq = vi.fn().mockResolvedValue({
      data: [
        { permission_id: 'documents.upload' },
        { permission_id: 'residents.view_roster' },
      ],
      error: null,
    });

    const deleteIn = vi.fn().mockResolvedValue({ error: null });
    const deleteEq = vi.fn().mockReturnValue({ in: deleteIn });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEq });

    const selectBuilder = {
      select: vi.fn().mockReturnValue({ eq: selectEq }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: deleteMock,
    };

    const from = vi.fn().mockImplementation((table: string) => {
      expect(table).toBe('role_permissions');
      return selectBuilder;
    });

    const client = { from } as any;

    await updateRolePermissions(client, 'role-1', [
      'documents.upload',
      'payments.view_ledger',
    ]);

    expect(selectBuilder.select).toHaveBeenCalledWith('permission_id');
    expect(selectEq).toHaveBeenCalledWith('role_id', 'role-1');
    expect(selectBuilder.insert).toHaveBeenCalledWith([
      { role_id: 'role-1', permission_id: 'payments.view_ledger' },
    ]);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteEq).toHaveBeenCalledWith('role_id', 'role-1');
    expect(deleteIn).toHaveBeenCalledWith('permission_id', ['residents.view_roster']);
  });
});
