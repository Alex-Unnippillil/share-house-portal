"use client";

import { RouteModal } from "@/components/route-modal";

export function DocumentPreviewSkeleton() {
  return (
    <RouteModal returnTo="/documents" className="sm:max-w-4xl">
      <div className="flex h-[70vh] w-full flex-col space-y-6 p-6">
        <div className="space-y-2">
          <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex-1 rounded-lg border bg-muted/20" />
      </div>
    </RouteModal>
  );
}
