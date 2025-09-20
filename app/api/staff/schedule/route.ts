import { NextResponse } from 'next/server';
import {
  defaultWorkOrderStore,
  generateICSFeed,
  type ScheduleListFilters,
} from '@/services/workorders';

function parseDate(value: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId') ?? undefined;
  const start = parseDate(searchParams.get('start'));
  const end = parseDate(searchParams.get('end'));

  const filters: ScheduleListFilters = {
    staffId,
    start,
    end,
  };

  const assignments = defaultWorkOrderStore.listScheduledAssignments(filters);
  const calendarName = staffId
    ? `Schedule for technician ${staffId}`
    : 'Staff Schedule';
  const body = generateICSFeed(assignments, { calendarName });

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="staff-schedule.ics"`,
    },
  });
}
