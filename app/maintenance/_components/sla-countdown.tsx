"use client";

import { useEffect, useMemo, useState } from "react";
import { intervalToDuration } from "date-fns";

import { cn } from "@/lib/utils";

const formatSeconds = (seconds: number) => {
  const duration = intervalToDuration({ start: 0, end: Math.abs(seconds) * 1000 });
  const parts: string[] = [];

  if (duration.days) parts.push(`${duration.days}d`);
  if (duration.hours) parts.push(`${duration.hours}h`);
  if (duration.minutes) parts.push(`${duration.minutes}m`);
  if (parts.length === 0 && duration.seconds !== undefined) {
    parts.push(`${duration.seconds}s`);
  }

  return parts.slice(0, 2).join(" ") || "0s";
};

export interface SlaCountdownProps {
  target: string;
  label: string;
  startedAt?: string | null;
  className?: string;
}

export function SlaCountdown({ target, label, startedAt, className }: SlaCountdownProps) {
  const targetDate = useMemo(() => new Date(target), [target]);
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    return Math.floor((targetDate.getTime() - Date.now()) / 1000);
  });

  useEffect(() => {
    setSecondsRemaining(Math.floor((targetDate.getTime() - Date.now()) / 1000));
    const interval = setInterval(() => {
      setSecondsRemaining(Math.floor((targetDate.getTime() - Date.now()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!Number.isFinite(targetDate.getTime())) {
    return null;
  }

  const isBreached = secondsRemaining < 0;
  const severityClass = isBreached
    ? "border-destructive/60 bg-destructive/10 text-destructive"
    : secondsRemaining < 3600
    ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";

  const startedAtLabel = startedAt
    ? (() => {
        const parsed = new Date(startedAt);
        return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : null;
      })()
    : null;

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-sm transition-colors",
        severityClass,
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="font-semibold uppercase tracking-wide">{label}</span>
        <span className="text-xs font-medium">
          {isBreached ? `Overdue by ${formatSeconds(secondsRemaining)}` : `${formatSeconds(secondsRemaining)} remaining`}
        </span>
        {startedAtLabel ? (
          <span className="text-[11px] text-muted-foreground">
            First response logged {startedAtLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
