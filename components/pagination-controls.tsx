'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  pageCount: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function PaginationControls({
  page,
  pageCount,
  total,
  limit,
  onPageChange,
  isLoading = false,
}: PaginationControlsProps) {
  const safePageCount = pageCount > 0 ? pageCount : 0;
  const safePage = safePageCount === 0 ? 0 : Math.min(Math.max(page, 1), safePageCount);

  const hasPrevious = safePageCount > 0 && safePage > 1;
  const hasNext = safePageCount > 0 && safePage < safePageCount;

  const startItem = total === 0 || safePageCount === 0 ? 0 : (safePage - 1) * limit + 1;
  const endItem = total === 0 || safePageCount === 0 ? 0 : Math.min(startItem + limit - 1, total);

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {total === 0
          ? 'Showing 0 to 0 of 0 entries'
          : `Showing ${startItem.toLocaleString()} to ${endItem.toLocaleString()} of ${total.toLocaleString()} entries`}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasPrevious || isLoading}
          onClick={() => hasPrevious && onPageChange(safePage - 1)}
        >
          <ChevronLeft className="mr-1 size-4" />
          Previous
        </Button>
        <div className="text-sm font-medium">
          Page {safePageCount === 0 ? 0 : safePage} of {safePageCount === 0 ? 0 : safePageCount}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasNext || isLoading}
          onClick={() => hasNext && onPageChange(safePage + 1)}
        >
          Next
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}
