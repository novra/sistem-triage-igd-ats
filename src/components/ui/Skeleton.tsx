import React from "react";
import { cn } from "../../lib/cn";

export function Skeleton({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-xl bg-black/8 dark:bg-white/10", className)}
      {...rest}
    />
  );
}

/** A ready-made row skeleton matching the RecordHistoryList card shape. */
export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-7 w-16 shrink-0 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy aria-label="Memuat data">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}
