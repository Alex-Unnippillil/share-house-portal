import type { ScheduledAssignment } from './types';

export interface IcsFeedOptions {
  calendarName?: string;
  prodId?: string;
  timeGenerated?: Date;
}

function formatDateToICS(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\n').replace(/,/g, '\,').replace(/;/g, '\;');
}

export function generateICSFeed(
  assignments: ScheduledAssignment[],
  options: IcsFeedOptions = {},
): string {
  const now = options.timeGenerated ?? new Date();
  const calendarName = options.calendarName ?? 'Staff Schedule';
  const prodId = options.prodId ?? '-//Share House Portal//Work Orders//EN';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    `NAME:${escapeText(calendarName)}`,
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `X-WR-TIMEZONE:UTC`,
  ];

  const dtStamp = formatDateToICS(now);

  for (const assignment of assignments) {
    const uid = `workorder-${assignment.workOrderId}-${assignment.technicianId ?? 'unassigned'}`;
    const dtStart = formatDateToICS(assignment.start);
    const dtEnd = formatDateToICS(assignment.end);
    const summary = escapeText(
      `${assignment.title} (${assignment.scheduleState.replace('_', ' ')})`,
    );
    const description = escapeText(
      assignment.description ?? 'Work order scheduled for technician',
    );

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    if (assignment.location) {
      lines.push(`LOCATION:${escapeText(assignment.location)}`);
    }
    if (assignment.technicianId) {
      lines.push(`CATEGORIES:Technician #${escapeText(assignment.technicianId)}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return `${lines.join('\r\n')}\r\n`;
}
