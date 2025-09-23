'use server';

import { buildCsvStream } from '@/lib/export/csv';
import { MEMBER_CSV_HEADERS, buildMemberCsvRows } from '@/lib/export/members';
import { getDashboardMembers } from '../data';
import { z } from 'zod';

const roleEnum = z.enum(['admin', 'user']);
const statusEnum = z.enum(['active', 'resigned']);
const sortFieldEnum = z.enum(['name', 'role', 'createdAt', 'status']);
const sortDirectionEnum = z.enum(['asc', 'desc']);

const memberExportFiltersSchema = z.object({
  query: z.string().trim().min(1).optional(),
  roles: z.array(roleEnum).min(1).optional(),
  statuses: z.array(statusEnum).min(1).optional(),
  sort: z
    .object({
      field: sortFieldEnum,
      direction: sortDirectionEnum.default('asc'),
    })
    .optional(),
});

export type MemberExportFilters = z.infer<typeof memberExportFiltersSchema>;

function filterMembers(
  members: Awaited<ReturnType<typeof getDashboardMembers>>,
  filters: MemberExportFilters
) {
  const normalizedQuery = filters.query?.toLowerCase();

  let results = members.filter((member) => {
    if (normalizedQuery) {
      const matchesQuery =
        member.name.toLowerCase().includes(normalizedQuery) ||
        member.role.toLowerCase().includes(normalizedQuery);
      if (!matchesQuery) {
        return false;
      }
    }

    if (filters.roles && filters.roles.length > 0) {
      if (!filters.roles.includes(member.role)) {
        return false;
      }
    }

    if (filters.statuses && filters.statuses.length > 0) {
      if (!filters.statuses.includes(member.status)) {
        return false;
      }
    }

    return true;
  });

  if (filters.sort) {
    const { field, direction } = filters.sort;
    const modifier = direction === 'desc' ? -1 : 1;

    results = [...results].sort((a, b) => {
      let comparison = 0;

      if (field === 'createdAt') {
        const aTime = Date.parse(a.createdAt);
        const bTime = Date.parse(b.createdAt);

        if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
          comparison = aTime - bTime;
        } else {
          const aValue = a.createdAt.toLowerCase();
          const bValue = b.createdAt.toLowerCase();
          if (aValue < bValue) comparison = -1;
          else if (aValue > bValue) comparison = 1;
        }
      } else {
        const aValue = a[field].toString().toLowerCase();
        const bValue = b[field].toString().toLowerCase();
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
      }

      return comparison * modifier;
    });
  }

  return results;
}

export async function exportMembersCsv(
  filters: MemberExportFilters = {}
): Promise<ReadableStream<Uint8Array>> {
  const parsedFilters = memberExportFiltersSchema.parse(filters ?? {});
  const members = await getDashboardMembers();
  const filteredMembers = filterMembers(members, parsedFilters);
  const rows = buildMemberCsvRows(filteredMembers);
  return buildCsvStream(MEMBER_CSV_HEADERS, rows);
}
