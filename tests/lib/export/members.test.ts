import { describe, expect, it } from 'vitest';

import { MEMBER_CSV_HEADERS, buildMemberCsvRows } from '@/lib/export/members';
import { buildCsvString } from '@/lib/export/csv';
import type { DashboardMember } from '@/app/dashboard/members/data';

describe('buildMemberCsvRows', () => {
  it('maps members to the visible table columns', () => {
    const members: DashboardMember[] = [
      {
        name: 'Alex Johnson',
        role: 'admin',
        createdAt: 'Mon Jun 10 2024',
        status: 'active',
      },
      {
        name: 'Taylor Singh',
        role: 'user',
        createdAt: 'Mon Jun 03 2024',
        status: 'resigned',
      },
    ];

    const rows = buildMemberCsvRows(members);
    const csv = buildCsvString(MEMBER_CSV_HEADERS, rows);

    expect(rows).toEqual([
      ['Alex Johnson', 'Admin', 'Mon Jun 10 2024', 'Active'],
      ['Taylor Singh', 'User', 'Mon Jun 03 2024', 'Resigned'],
    ]);

    expect(csv.split('\n')[0]).toBe('"Name","Role","Joined","Status"');
  });
});
