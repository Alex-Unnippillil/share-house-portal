'use client';

import { useMemo, useState, useTransition } from 'react';

import type { PermissionCategory, PermissionGroup, PermissionId, RoleWithPermissions } from '@/lib/data/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

import { updateRolePermissionsAction } from '../actions';

type AssignmentMap = Map<string, Set<PermissionId>>;

type StatusState =
  | { type: 'idle' }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

interface RolePermissionManagerProps {
  roles: RoleWithPermissions[];
  permissionCatalog: PermissionCategory[];
}

function createAssignmentMap(roles: RoleWithPermissions[]): AssignmentMap {
  return new Map(roles.map((role) => [role.id, new Set(role.permission_ids)]));
}

function cloneSet<T>(values: Set<T> | undefined): Set<T> {
  return new Set(values ?? []);
}

function setsAreEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) {
    return false;
  }

  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }

  return true;
}

function getSelectionState(group: PermissionGroup, assignments: Set<PermissionId>): {
  selectedCount: number;
  total: number;
} {
  const selectedCount = group.permissions.reduce(
    (count, permission) => (assignments.has(permission.id) ? count + 1 : count),
    0
  );

  return { selectedCount, total: group.permissions.length };
}

export function RolePermissionManager({
  roles,
  permissionCatalog,
}: RolePermissionManagerProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(roles[0]?.id ?? null);
  const [assignments, setAssignments] = useState<AssignmentMap>(() => createAssignmentMap(roles));
  const [initialAssignments, setInitialAssignments] = useState<AssignmentMap>(() => createAssignmentMap(roles));
  const [status, setStatus] = useState<StatusState>({ type: 'idle' });
  const [isPending, startTransition] = useTransition();

  const selectedRole = useMemo(() => {
    if (!selectedRoleId) {
      return null;
    }
    return roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null;
  }, [roles, selectedRoleId]);

  const currentAssignments = useMemo(() => {
    if (!selectedRole) {
      return new Set<PermissionId>();
    }
    return assignments.get(selectedRole.id) ?? new Set<PermissionId>();
  }, [assignments, selectedRole]);

  const hasChanges = useMemo(() => {
    if (!selectedRole) {
      return false;
    }
    const initialSet = initialAssignments.get(selectedRole.id) ?? new Set<PermissionId>();
    return !setsAreEqual(initialSet, currentAssignments);
  }, [initialAssignments, currentAssignments, selectedRole]);

  if (roles.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No roles configured yet</CardTitle>
          <CardDescription>
            Create a role in Supabase to begin assigning permissions. Roles are synced from the `roles` table.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handlePermissionToggle = (permissionId: PermissionId, checked: boolean | string) => {
    if (!selectedRole) {
      return;
    }

    setStatus({ type: 'idle' });
    setAssignments((previous) => {
      const next = new Map(previous);
      const roleAssignments = cloneSet(next.get(selectedRole.id));

      if (checked) {
        roleAssignments.add(permissionId);
      } else {
        roleAssignments.delete(permissionId);
      }

      next.set(selectedRole.id, roleAssignments);
      return next;
    });
  };

  const handleGroupSelect = (group: PermissionGroup, selectAll: boolean) => {
    if (!selectedRole) {
      return;
    }

    setStatus({ type: 'idle' });
    setAssignments((previous) => {
      const next = new Map(previous);
      const roleAssignments = cloneSet(next.get(selectedRole.id));

      for (const permission of group.permissions) {
        if (selectAll) {
          roleAssignments.add(permission.id);
        } else {
          roleAssignments.delete(permission.id);
        }
      }

      next.set(selectedRole.id, roleAssignments);
      return next;
    });
  };

  const handleSave = () => {
    if (!selectedRole) {
      return;
    }

    const permissions = Array.from(assignments.get(selectedRole.id) ?? []);

    setStatus({ type: 'idle' });
    startTransition(async () => {
      const result = await updateRolePermissionsAction({
        roleId: selectedRole.id,
        permissions,
      });

      if (!result.success) {
        setStatus({
          type: 'error',
          message: result.error ?? 'Unable to update permissions right now.',
        });
        return;
      }

      const normalized = new Set(result.permissions ?? permissions);
      setAssignments((previous) => {
        const next = new Map(previous);
        next.set(selectedRole.id, new Set(normalized));
        return next;
      });
      setInitialAssignments((previous) => {
        const next = new Map(previous);
        next.set(selectedRole.id, new Set(normalized));
        return next;
      });
      setStatus({ type: 'success', message: 'Permissions updated successfully.' });
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-2">
        {roles.map((role) => {
          const roleAssignment = assignments.get(role.id);
          const assignedCount = roleAssignment?.size ?? 0;
          const isSelected = selectedRole?.id === role.id;

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => {
                setSelectedRoleId(role.id);
                setStatus({ type: 'idle' });
              }}
              className={cn(
                'w-full rounded-lg border p-4 text-left transition hover:border-primary',
                isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-muted'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{role.name}</p>
                  <p className="text-xs text-muted-foreground">{role.slug}</p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                  {assignedCount} selected
                </span>
              </div>
              {role.description && (
                <p className="mt-2 text-xs text-muted-foreground">{role.description}</p>
              )}
            </button>
          );
        })}
      </aside>

      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold leading-tight">
              {selectedRole ? selectedRole.name : 'Select a role'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Assign or revoke fine-grained permissions. Changes are saved per role.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!selectedRole) return;
                setAssignments((previous) => {
                  const next = new Map(previous);
                  next.set(
                    selectedRole.id,
                    cloneSet(initialAssignments.get(selectedRole.id))
                  );
                  return next;
                });
                setStatus({ type: 'idle' });
              }}
              disabled={!selectedRole || !hasChanges || isPending}
            >
              Reset
            </Button>
            <Button onClick={handleSave} disabled={!selectedRole || !hasChanges} isLoading={isPending}>
              Save changes
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {permissionCatalog.map((category) => (
            <Card key={category.id}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">{category.label}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {category.groups.map((group) => {
                  const { selectedCount, total } = getSelectionState(group, currentAssignments);
                  const allSelected = selectedCount === total;
                  const noneSelected = selectedCount === 0;

                  return (
                    <section key={`${category.id}-${group.id}`} className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold leading-tight">{group.label}</h3>
                          <p className="text-sm text-muted-foreground">{group.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {selectedCount} / {total} selected
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGroupSelect(group, true)}
                            disabled={allSelected || !selectedRole}
                          >
                            Select all
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGroupSelect(group, false)}
                            disabled={noneSelected || !selectedRole}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {group.permissions.map((permission) => {
                          const checkboxId = `${group.id}-${permission.id}`;
                          const isChecked = currentAssignments.has(permission.id);

                          return (
                            <label
                              key={permission.id}
                              htmlFor={checkboxId}
                              className={cn(
                                'flex items-start gap-3 rounded-lg border p-3',
                                isChecked ? 'border-primary bg-primary/5' : 'border-muted'
                              )}
                            >
                              <Checkbox
                                id={checkboxId}
                                checked={isChecked}
                                onCheckedChange={(checked) => handlePermissionToggle(permission.id, Boolean(checked))}
                                disabled={!selectedRole}
                              />
                              <div className="space-y-1">
                                <p className="text-sm font-medium leading-tight">{permission.label}</p>
                                <p className="text-xs text-muted-foreground">{permission.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {status.type !== 'idle' && (
          <div
            role="status"
            className={cn(
              'rounded-lg border p-3 text-sm',
              status.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-700/60 dark:bg-green-950/40 dark:text-green-200'
                : 'border-destructive/50 bg-destructive/10 text-destructive'
            )}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}

export default RolePermissionManager;
