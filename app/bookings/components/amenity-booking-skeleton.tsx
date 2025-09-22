"use client";

import { RouteModal } from "@/components/route-modal";

export function AmenityBookingSkeleton() {
  return (
    <RouteModal returnTo="/bookings" className="sm:max-w-lg">
      <div className="flex h-[60vh] flex-col space-y-6 p-6">
        <div className="space-y-2">
          <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex-1 space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <div className="h-10 w-20 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </RouteModal>
  );
}
