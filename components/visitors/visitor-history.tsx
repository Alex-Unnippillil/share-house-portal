"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  VISITOR_POLICY,
  fetchVisitorHistory,
  summarizeVisitorHistory,
  type VisitorLogRow,
} from "@/lib/data/visitors";
import { createClient } from "@/utils/supabase-browser";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";

interface VisitorHistoryProps {
  refreshKey?: number;
}

const statusLabels: Record<NonNullable<VisitorLogRow["status"]>, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

const statusVariants: Record<NonNullable<VisitorLogRow["status"]>, BadgeProps["variant"]> = {
  pending: "secondary",
  approved: "complete",
  rejected: "destructive",
  completed: "default",
};

export function VisitorHistory({ refreshKey = 0 }: VisitorHistoryProps) {
  const supabase = createClient();
  const typedSupabase = useMemo(
    () => supabase as unknown as TypedSupabaseClient,
    [supabase]
  );
  const [history, setHistory] = useState<VisitorLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        if (isMounted) {
          setError(userError.message);
          setHistory([]);
          setIsLoading(false);
        }
        return;
      }

      if (!user) {
        if (isMounted) {
          setError("Sign in to view visitor history.");
          setHistory([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const logs = await fetchVisitorHistory(typedSupabase, user.id);
        if (isMounted) {
          setHistory(logs);
        }
      } catch (historyError) {
        if (isMounted) {
          setError(
            historyError instanceof Error
              ? historyError.message
              : "Failed to load visitor history"
          );
          setHistory([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [refreshKey, supabase, typedSupabase]);

  const summary = useMemo(() => summarizeVisitorHistory(history), [history]);

  const recentEntries = useMemo(
    () =>
      history.slice(0, 5).map((entry) => {
        const checkIn = entry.check_in_date ? parseISO(entry.check_in_date) : null;
        const checkOut = entry.check_out_date ? parseISO(entry.check_out_date) : null;
        const nights =
          checkIn && checkOut
            ? Math.max(0, differenceInCalendarDays(checkOut, checkIn))
            : null;

        return { ...entry, checkIn, checkOut, nights };
      }),
    [history]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Visitor History</CardTitle>
        <CardDescription>
          Review recent overnight guests and how close you are to the stay limit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : (
          <>
            <div className="grid gap-2 rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Policy limit</span>
                <span className="font-medium">
                  {VISITOR_POLICY.maxConsecutiveNights} consecutive nights
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unique visitors</span>
                <span className="font-medium">{summary.uniqueVisitors}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total nights logged</span>
                <span className="font-medium">{summary.totalNights}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Longest stay</span>
                <span className="font-medium">
                  {summary.longestStay} night{summary.longestStay === 1 ? "" : "s"}
                </span>
              </div>
              {summary.lastVisit && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last visitor</span>
                  <span className="font-medium">
                    {summary.lastVisit.guestName || "Unknown"} ·{" "}
                    {format(summary.lastVisit.checkInDate, "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Recent stays</p>
              {recentEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No overnight visitors recorded yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentEntries.map((entry) => {
                    const status = (entry.status ?? "pending") as NonNullable<
                      VisitorLogRow["status"]
                    >;
                    const label = statusLabels[status] ?? status;
                    const variant = statusVariants[status] ?? "secondary";

                    return (
                      <li key={entry.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{entry.guest_name}</span>
                          <Badge variant={variant}>{label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {entry.checkIn ? format(entry.checkIn, "MMM d, yyyy") : "—"} →{" "}
                          {entry.checkOut ? format(entry.checkOut, "MMM d, yyyy") : "—"}
                          {typeof entry.nights === "number" && (
                            <> · {entry.nights} night{entry.nights === 1 ? "" : "s"}</>
                          )}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
