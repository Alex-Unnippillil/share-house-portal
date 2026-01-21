import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';
import type { Database } from '@/lib/supabase';

interface PermissionDescriptor {
  id: string;
  label: string;
  description: string;
}

interface PermissionGroupDescriptor {
  id: string;
  label: string;
  description: string;
  permissions: readonly PermissionDescriptor[];
}

interface PermissionCategoryDescriptor {
  id: string;
  label: string;
  description: string;
  groups: readonly PermissionGroupDescriptor[];
}

type SupabaseClientLike = Pick<TypedSupabaseClient, 'from'>;

type RoleRow = Database['public']['Tables']['roles']['Row'];
type RolePermissionRow = Database['public']['Tables']['role_permissions']['Row'];

type PermissionRow = Database['public']['Tables']['permissions']['Row'];

export const PERMISSION_CATALOG = [
  {
    id: 'residents',
    label: 'Residents & Leasing',
    description: 'Control access to resident rosters, lease details, and onboarding tools.',
    groups: [
      {
        id: 'residents.insights',
        label: 'Resident Insights',
        description: 'Read-only visibility into resident and lease state.',
        permissions: [
          {
            id: 'residents.view_roster',
            label: 'View resident roster',
            description: 'Browse resident profiles and filter by building, unit, or status.',
          },
          {
            id: 'residents.view_sensitive_fields',
            label: 'View sensitive resident fields',
            description: 'Access phone numbers, emergency contacts, and other PII in resident records.',
          },
          {
            id: 'residents.view_lease_status',
            label: 'View lease status and renewal signals',
            description: 'Inspect lease terms, renewal deadlines, and rent share allocations.',
          },
        ],
      },
      {
        id: 'residents.management',
        label: 'Resident Management',
        description: 'Create, update, and deactivate resident records.',
        permissions: [
          {
            id: 'residents.invite',
            label: 'Invite or import residents',
            description: 'Send invitations, bulk import rosters, and trigger onboarding flows.',
          },
          {
            id: 'residents.manage_roles',
            label: 'Assign building roles',
            description: 'Promote residents to roommates, staff, or property managers for a building.',
          },
          {
            id: 'residents.manage_unit_assignments',
            label: 'Manage unit assignments',
            description: 'Move residents between units, update rent share amounts, and adjust lease occupants.',
          },
          {
            id: 'residents.deactivate',
            label: 'Deactivate or archive residents',
            description: 'Suspend portal access, archive historical data, and trigger exit workflows.',
          },
        ],
      },
    ],
  },
  {
    id: 'payments',
    label: 'Payments & Billing',
    description: 'Configure rent collection workflows, Stripe integrations, and reporting.',
    groups: [
      {
        id: 'payments.visibility',
        label: 'Payment Visibility',
        description: 'Read-only access to ledgers, subscriptions, and payment status.',
        permissions: [
          {
            id: 'payments.view_ledger',
            label: 'View rent ledger',
            description: 'Review tenant balances, payment history, and outstanding invoices.',
          },
          {
            id: 'payments.view_failures',
            label: 'Monitor failed or overdue payments',
            description: 'See failed Stripe charges, dunning state, and retry attempts.',
          },
          {
            id: 'payments.view_subscriptions',
            label: 'View subscriptions and autopay',
            description: 'Inspect recurring payment schedules and autopay enrollment.',
          },
        ],
      },
      {
        id: 'payments.actions',
        label: 'Payment Operations',
        description: 'Perform operational tasks against rent payments.',
        permissions: [
          {
            id: 'payments.issue_refunds',
            label: 'Issue refunds or credits',
            description: 'Create one-time credits and initiate refund flows back through Stripe.',
          },
          {
            id: 'payments.update_autopay',
            label: 'Update autopay preferences',
            description: 'Enable, pause, or modify autopay settings on behalf of residents.',
          },
          {
            id: 'payments.manage_stripe_customers',
            label: 'Manage Stripe customers and mandates',
            description: 'Update saved payment methods, billing addresses, and SEPA mandates.',
          },
        ],
      },
      {
        id: 'payments.reporting',
        label: 'Financial Reporting',
        description: 'Deep financial analytics and data exports.',
        permissions: [
          {
            id: 'payments.export',
            label: 'Export payment data',
            description: 'Download CSV exports, generate rent roll snapshots, and schedule reports.',
          },
          {
            id: 'payments.reconcile_payouts',
            label: 'Reconcile payouts',
            description: 'Match Stripe payouts against ledger entries and mark reconciliation status.',
          },
        ],
      },
    ],
  },
  {
    id: 'documents',
    label: 'Documents & Compliance',
    description: 'Manage leases, addenda, and compliance audit trails.',
    groups: [
      {
        id: 'documents.access',
        label: 'Document Visibility',
        description: 'Read-only document access across properties.',
        permissions: [
          {
            id: 'documents.view_all',
            label: 'View all documents',
            description: 'Open any lease, addendum, or compliance document stored in Roomsily.',
          },
          {
            id: 'documents.view_audit_logs',
            label: 'View document audit logs',
            description: 'Review access logs, signature events, and download history.',
          },
          {
            id: 'documents.download_signed',
            label: 'Download signed agreements',
            description: 'Retrieve signed PDF copies and supporting attachments.',
          },
        ],
      },
      {
        id: 'documents.workflow',
        label: 'Document Workflows',
        description: 'Create and manage document lifecycles.',
        permissions: [
          {
            id: 'documents.upload',
            label: 'Upload new documents',
            description: 'Create new documents, attach templates, and populate metadata.',
          },
          {
            id: 'documents.request_signatures',
            label: 'Send signature requests',
            description: 'Initiate Documenso signature packets and manage signer order.',
          },
          {
            id: 'documents.edit_metadata',
            label: 'Edit document metadata',
            description: 'Update document types, assign tenants, and adjust expiration dates.',
          },
          {
            id: 'documents.retire_versions',
            label: 'Retire or supersede versions',
            description: 'Archive outdated agreements and maintain version lineage.',
          },
        ],
      },
      {
        id: 'documents.templates',
        label: 'Template Governance',
        description: 'Control Documenso templates and sharing policies.',
        permissions: [
          {
            id: 'documents.manage_templates',
            label: 'Manage Documenso templates',
            description: 'Create, edit, and publish Documenso templates for the organization.',
          },
          {
            id: 'documents.share_external',
            label: 'Share documents externally',
            description: 'Generate secure external links and manage expiration policies.',
          },
        ],
      },
    ],
  },
  {
    id: 'amenities',
    label: 'Amenities & Bookings',
    description: 'Govern amenity schedules, conflict resolution, and booking policies.',
    groups: [
      {
        id: 'amenities.visibility',
        label: 'Calendar Visibility',
        description: 'Review amenity schedules and conflict signals.',
        permissions: [
          {
            id: 'amenities.view_schedules',
            label: 'View amenity calendars',
            description: 'Inspect bookings for shared resources across buildings.',
          },
          {
            id: 'amenities.review_conflicts',
            label: 'Review booking conflicts',
            description: 'See conflict alerts, double-booking attempts, and audit history.',
          },
          {
            id: 'amenities.view_guest_list',
            label: 'View guest registrations',
            description: 'Access overnight guest approvals and visitor rosters.',
          },
        ],
      },
      {
        id: 'amenities.management',
        label: 'Booking Management',
        description: 'Change bookings and enforce policy controls.',
        permissions: [
          {
            id: 'amenities.override_bookings',
            label: 'Override bookings',
            description: 'Manually confirm, cancel, or reassign amenity reservations.',
          },
          {
            id: 'amenities.manage_rules',
            label: 'Manage booking rules',
            description: 'Configure blackout windows, guest limits, and per-unit quotas.',
          },
          {
            id: 'amenities.sync_calendars',
            label: 'Sync with Cal.com',
            description: 'Trigger sync jobs and repair integrations with Cal.com calendars.',
          },
        ],
      },
      {
        id: 'amenities.reporting',
        label: 'Usage Reporting',
        description: 'Analyze amenity utilization patterns.',
        permissions: [
          {
            id: 'amenities.export_usage',
            label: 'Export amenity usage',
            description: 'Download aggregated booking metrics for analytics tools.',
          },
          {
            id: 'amenities.configure_notifications',
            label: 'Configure booking notifications',
            description: 'Manage reminder emails, push notifications, and escalation rules.',
          },
        ],
      },
    ],
  },
  {
    id: 'maintenance',
    label: 'Maintenance & Support',
    description: 'Coordinate maintenance workflows and resident support cases.',
    groups: [
      {
        id: 'maintenance.triage',
        label: 'Maintenance Triage',
        description: 'Initial handling of work orders and maintenance tickets.',
        permissions: [
          {
            id: 'maintenance.view_all_requests',
            label: 'View all maintenance requests',
            description: 'See maintenance tickets across buildings with triage context.',
          },
          {
            id: 'maintenance.assign_team',
            label: 'Assign maintenance team members',
            description: 'Delegate tickets to staff, vendors, or property managers.',
          },
          {
            id: 'maintenance.update_status',
            label: 'Update ticket status',
            description: 'Advance tickets through pending, in-progress, and completed states.',
          },
        ],
      },
      {
        id: 'maintenance.operations',
        label: 'Maintenance Operations',
        description: 'Ongoing coordination and compliance.',
        permissions: [
          {
            id: 'maintenance.schedule_followups',
            label: 'Schedule follow-ups',
            description: 'Book follow-up visits and communicate with residents.',
          },
          {
            id: 'maintenance.manage_vendors',
            label: 'Manage vendor access',
            description: 'Invite third-party vendors, control access, and log visits.',
          },
          {
            id: 'maintenance.export_logs',
            label: 'Export maintenance logs',
            description: 'Download maintenance history and cost breakdowns.',
          },
        ],
      },
      {
        id: 'support.escalations',
        label: 'Support Escalations',
        description: 'Coordinate support cases outside of maintenance.',
        permissions: [
          {
            id: 'support.create_cases',
            label: 'Create support cases',
            description: 'Open help-desk tickets on behalf of residents and attach context.',
          },
          {
            id: 'support.view_private_notes',
            label: 'View private support notes',
            description: 'Read internal commentary and secure attachments for cases.',
          },
          {
            id: 'support.close_cases',
            label: 'Close or escalate cases',
            description: 'Resolve, escalate, or archive help-desk cases with audit logging.',
          },
        ],
      },
    ],
  },
  {
    id: 'communications',
    label: 'Communications & Analytics',
    description: 'Broadcast announcements, moderate the message board, and review analytics.',
    groups: [
      {
        id: 'communications.moderation',
        label: 'Community Moderation',
        description: 'Control the message board and tenant communications.',
        permissions: [
          {
            id: 'communications.moderate_board',
            label: 'Moderate message board',
            description: 'Edit, delete, or restore posts and comments in the community feed.',
          },
          {
            id: 'communications.pin_announcements',
            label: 'Pin announcements',
            description: 'Highlight announcements and control announcement visibility timelines.',
          },
          {
            id: 'communications.archive_threads',
            label: 'Archive conversation threads',
            description: 'Archive or lock old threads while preserving audit history.',
          },
        ],
      },
      {
        id: 'communications.notifications',
        label: 'Broadcast Notifications',
        description: 'Send targeted notifications and emails.',
        permissions: [
          {
            id: 'communications.send_broadcasts',
            label: 'Send broadcasts',
            description: 'Send SMS, email, or push broadcasts to building residents.',
          },
          {
            id: 'communications.configure_templates',
            label: 'Configure notification templates',
            description: 'Manage reusable notification templates and translation variants.',
          },
          {
            id: 'communications.view_delivery_metrics',
            label: 'View delivery metrics',
            description: 'See notification engagement, bounce events, and deliverability.',
          },
        ],
      },
      {
        id: 'analytics.access',
        label: 'Analytics Access',
        description: 'View platform metrics and configure data retention.',
        permissions: [
          {
            id: 'analytics.view_dashboards',
            label: 'View analytics dashboards',
            description: 'Access portfolio KPIs, occupancy trends, and churn insights.',
          },
          {
            id: 'analytics.export_reports',
            label: 'Export analytics reports',
            description: 'Download operational reports and custom analytics extracts.',
          },
          {
            id: 'analytics.manage_data_retention',
            label: 'Manage data retention policies',
            description: 'Adjust retention windows and trigger purge workflows for compliance.',
          },
        ],
      },
    ],
  },
] as const satisfies readonly PermissionCategoryDescriptor[];

type PermissionCatalogDefinition = typeof PERMISSION_CATALOG;
export type PermissionCategory = PermissionCatalogDefinition[number];
export type PermissionGroup = PermissionCategory['groups'][number];
export type PermissionDefinition = PermissionGroup['permissions'][number];
export type PermissionId = PermissionDefinition['id'];

const ALL_PERMISSION_IDS: PermissionId[] = PERMISSION_CATALOG.flatMap((category) =>
  category.groups.flatMap((group) => group.permissions.map((permission) => permission.id))
) as PermissionId[];

const PERMISSION_ID_SET = new Set<string>(ALL_PERMISSION_IDS);

function handlePostgrestError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export function getPermissionCatalog(): PermissionCategory[] {
  return PERMISSION_CATALOG.map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      permissions: group.permissions.map((permission) => ({ ...permission })),
    })),
  }));
}

export function isPermissionId(value: string): value is PermissionId {
  return PERMISSION_ID_SET.has(value);
}

export function normalizePermissionIds(values: Iterable<string>): PermissionId[] {
  const normalized: PermissionId[] = [];
  for (const value of values) {
    if (isPermissionId(value) && !normalized.includes(value)) {
      normalized.push(value);
    }
  }
  return normalized;
}

export interface RoleWithPermissions extends RoleRow {
  permission_ids: PermissionId[];
}

export async function fetchRolesWithPermissions(
  client: SupabaseClientLike
): Promise<RoleWithPermissions[]> {
  const { data: rolesData, error: rolesError } = await client
    .from('roles')
    .select('id, slug, name, description, is_system, created_at, updated_at')
    .order('name', { ascending: true });

  handlePostgrestError(rolesError, 'Failed to load roles');

  const roles = ((rolesData ?? []) as RoleRow[])
    .filter((role) => Boolean(role.id && role.slug && role.name))
    .map((role) => ({
      ...role,
      description: role.description ?? null,
      is_system: role.is_system ?? null,
      created_at: role.created_at ?? null,
      updated_at: role.updated_at ?? null,
    }));

  if (roles.length === 0) {
    return [];
  }

  const { data: assignmentData, error: assignmentError } = await client
    .from('role_permissions')
    .select('role_id, permission_id');

  handlePostgrestError(assignmentError, 'Failed to load role permissions');

  const assignments = new Map<string, PermissionId[]>();
  for (const record of (assignmentData ?? []) as RolePermissionRow[]) {
    if (!record.role_id || !record.permission_id) continue;
    if (!assignments.has(record.role_id)) {
      assignments.set(record.role_id, []);
    }
    if (isPermissionId(record.permission_id)) {
      assignments.get(record.role_id)!.push(record.permission_id);
    }
  }

  return roles.map((role) => ({
    ...role,
    permission_ids: normalizePermissionIds(assignments.get(role.id) ?? []),
  }));
}

export async function updateRolePermissions(
  client: SupabaseClientLike,
  roleId: string,
  desiredPermissions: Iterable<string>
): Promise<void> {
  const desired = new Set(normalizePermissionIds(desiredPermissions));

  const { data: existingAssignments, error: existingError } = await client
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', roleId);

  handlePostgrestError(existingError, 'Failed to read current role permissions');

  const existingSet = new Set<PermissionId>(
    normalizePermissionIds(((existingAssignments ?? []) as RolePermissionRow[]).map((assignment) => assignment.permission_id))
  );

  const toInsert = Array.from(desired).filter((permissionId) => !existingSet.has(permissionId));
  const toDelete = Array.from(existingSet).filter((permissionId) => !desired.has(permissionId));

  if (toInsert.length > 0) {
    const { error: insertError } = await client
      .from('role_permissions')
      .insert(
        toInsert.map((permissionId) => ({
          role_id: roleId,
          permission_id: permissionId,
        }))
      );

    handlePostgrestError(insertError, 'Failed to assign new permissions to role');
  }

  if (toDelete.length > 0) {
    const { error: deleteError } = await (client as any)
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .in('permission_id', toDelete);

    handlePostgrestError(deleteError, 'Failed to revoke permissions from role');
  }
}

export async function fetchPermissionDefinitions(
  client: SupabaseClientLike
): Promise<PermissionRow[]> {
  const { data, error } = await client
    .from('permissions')
    .select('id, category, action, description, created_at');

  handlePostgrestError(error, 'Failed to load permission definitions');

  return (data as PermissionRow[] | null | undefined) ?? [];
}
