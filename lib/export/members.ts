import type { DashboardMember } from '@/app/dashboard/members/data';

import type { CsvCell } from './csv';

export const MEMBER_CSV_HEADERS = ['Name', 'Role', 'Joined', 'Status'];

function capitalizeLabel(value: string): string {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildMemberCsvRows(members: DashboardMember[]): CsvCell[][] {
  return members.map((member) => [
    member.name,
    capitalizeLabel(member.role),
    member.createdAt,
    capitalizeLabel(member.status),
  ]);
}
