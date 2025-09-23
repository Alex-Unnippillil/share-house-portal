"use client";

import React from "react";
import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, logEmptyStateConversion } from "@/lib/utils";

export interface EmptyStateSampleItem {
  title: string;
  description?: string;
  metadata?: string;
}

export interface EmptyStateProps {
  surface: string;
  title: string;
  description: string;
  illustration: ReactNode;
  sampleItems?: EmptyStateSampleItem[];
  primaryAction: {
    href: string;
    label?: string;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    analyticsMetadata?: Record<string, unknown>;
  };
  className?: string;
}

export function EmptyState({
  surface,
  title,
  description,
  illustration,
  sampleItems,
  primaryAction,
  className,
}: EmptyStateProps) {
  const { href, label = "Create", onClick, analyticsMetadata } = primaryAction;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (!event.defaultPrevented) {
      logEmptyStateConversion(surface, href, {
        sampleCount: sampleItems?.length ?? 0,
        ...analyticsMetadata,
      });
    }
  };

  return (
    <Card className={cn("flex flex-col items-center gap-8 p-10 text-center sm:p-12", className)}>
      <div
        aria-hidden="true"
        className="flex h-20 w-20 items-center justify-center rounded-full bg-muted"
      >
        {illustration}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {sampleItems && sampleItems.length > 0 ? (
        <div className="w-full max-w-md rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Example entries
          </p>
          <ul className="mt-4 space-y-4">
            {sampleItems.map((item, index) => (
              <li key={`${item.title}-${index}`} className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {item.metadata ? (
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {item.metadata}
                    </span>
                  ) : null}
                </div>
                {item.description ? (
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link
        href={href}
        aria-label={`${label} ${title.toLowerCase()}`}
        onClick={handleClick}
        className={cn(buttonVariants({ variant: "default" }), "px-6")}
      >
        {label}
      </Link>
    </Card>
  );
}
