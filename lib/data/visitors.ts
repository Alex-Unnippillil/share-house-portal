import { differenceInCalendarDays, parseISO, startOfDay, startOfToday, subDays } from "date-fns";

import type { Database } from "@/lib/supabase";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";

const ACTIVE_VISITOR_STATUSES = ["pending", "approved", "completed"] as const;

export const VISITOR_POLICY = {
  /** Maximum number of consecutive nights a visitor can stay */
  maxConsecutiveNights: 5,
  /** Number of days of history to show in the dashboard */
  historyWindowDays: 180,
} as const;

export type VisitorLogRow = Database["public"]["Tables"]["visitor_logs"]["Row"];

type SupabaseClientLike = Pick<TypedSupabaseClient, "from">;

export interface VisitorPolicyErrorDetails {
  limit: number;
  requestedNights: number;
  consecutiveNights: number;
}

export class VisitorPolicyError extends Error {
  readonly limit: number;

  readonly requestedNights: number;

  readonly consecutiveNights: number;

  constructor({ limit, requestedNights, consecutiveNights }: VisitorPolicyErrorDetails) {
    super(
      `This request would result in ${consecutiveNights} consecutive nights which exceeds the policy limit of ${limit}.`
    );
    this.name = "VisitorPolicyError";
    this.limit = limit;
    this.requestedNights = requestedNights;
    this.consecutiveNights = consecutiveNights;
  }
}

interface DateInterval {
  start: Date;
  end: Date;
}

function normaliseDate(value: string | Date | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfDay(parsed);
}

function calculateNights(start: Date, end: Date): number {
  return Math.max(0, differenceInCalendarDays(end, start));
}

function calculateLongestConsecutiveNights(intervals: DateInterval[]): number {
  if (!intervals.length) {
    return 0;
  }

  const sorted = intervals
    .map((interval) => ({
      start: startOfDay(interval.start),
      end: startOfDay(interval.end),
    }))
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (!sorted.length) {
    return 0;
  }

  let longest = 0;
  let currentStart = sorted[0].start;
  let currentEnd = sorted[0].end;

  const commitCurrent = () => {
    const nights = calculateNights(currentStart, currentEnd);
    if (nights > longest) {
      longest = nights;
    }
  };

  for (let index = 1; index < sorted.length; index += 1) {
    const interval = sorted[index];

    if (interval.start <= currentEnd) {
      if (interval.end > currentEnd) {
        currentEnd = interval.end;
      }
      continue;
    }

    commitCurrent();
    currentStart = interval.start;
    currentEnd = interval.end;
  }

  commitCurrent();

  return longest;
}

export async function ensureVisitorStayWithinPolicy(
  client: SupabaseClientLike,
  {
    hostId,
    guestEmail,
    checkInDate,
    checkOutDate,
  }: {
    hostId: string;
    guestEmail: string;
    checkInDate: Date;
    checkOutDate: Date;
  }
): Promise<{ consecutiveNights: number; requestedNights: number }> {
  const normalisedCheckIn = startOfDay(checkInDate);
  const normalisedCheckOut = startOfDay(checkOutDate);
  const requestedNights = calculateNights(normalisedCheckIn, normalisedCheckOut);

  const { data, error } = await client
    .from("visitor_logs")
    .select("check_in_date, check_out_date, status")
    .eq("host_id", hostId)
    .eq("guest_email", guestEmail)
    .in("status", ACTIVE_VISITOR_STATUSES as unknown as string[]);

  if (error) {
    throw new Error(`Failed to verify visitor policy: ${error.message}`);
  }

  const intervals: DateInterval[] = (data ?? [])
    .filter((log) => log.check_in_date && log.check_out_date)
    .map((log) => ({
      start: normaliseDate(log.check_in_date)!,
      end: normaliseDate(log.check_out_date)!,
    }));

  intervals.push({
    start: normalisedCheckIn,
    end: normalisedCheckOut,
  });

  const consecutiveNights = calculateLongestConsecutiveNights(intervals);

  if (consecutiveNights > VISITOR_POLICY.maxConsecutiveNights) {
    throw new VisitorPolicyError({
      limit: VISITOR_POLICY.maxConsecutiveNights,
      requestedNights,
      consecutiveNights,
    });
  }

  return { consecutiveNights, requestedNights };
}

export async function fetchVisitorHistory(
  client: SupabaseClientLike,
  hostId: string,
  {
    limit = 10,
    sinceDays = VISITOR_POLICY.historyWindowDays,
  }: {
    limit?: number;
    sinceDays?: number;
  } = {}
): Promise<VisitorLogRow[]> {
  let query = client
    .from("visitor_logs")
    .select("id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, status")
    .eq("host_id", hostId)
    .order("check_in_date", { ascending: false })
    .limit(limit);

  if (sinceDays > 0) {
    const sinceDate = subDays(startOfToday(), sinceDays).toISOString();
    query = query.gte("check_in_date", sinceDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load visitor history: ${error.message}`);
  }

  return (data as VisitorLogRow[] | null | undefined) ?? [];
}

export interface VisitorHistorySummary {
  totalNights: number;
  uniqueVisitors: number;
  longestStay: number;
  lastVisit?: {
    guestName: string;
    checkInDate: Date;
    checkOutDate: Date;
    nights: number;
    status: VisitorLogRow["status"] | null;
  };
}

export function summarizeVisitorHistory(logs: VisitorLogRow[]): VisitorHistorySummary {
  const uniqueVisitors = new Set<string>();
  let totalNights = 0;
  let longestStay = 0;
  let lastVisit: VisitorHistorySummary["lastVisit"];

  for (const log of logs) {
    const checkIn = normaliseDate(log.check_in_date);
    const checkOut = normaliseDate(log.check_out_date);

    if (log.guest_email) {
      uniqueVisitors.add(log.guest_email.toLowerCase());
    }

    if (!checkIn || !checkOut) {
      continue;
    }

    const nights = calculateNights(checkIn, checkOut);
    totalNights += nights;
    if (nights > longestStay) {
      longestStay = nights;
    }

    if (!lastVisit || checkIn > lastVisit.checkInDate) {
      lastVisit = {
        guestName: log.guest_name,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        nights,
        status: log.status,
      };
    }
  }

  return {
    totalNights,
    uniqueVisitors: uniqueVisitors.size,
    longestStay,
    lastVisit,
  };
}
