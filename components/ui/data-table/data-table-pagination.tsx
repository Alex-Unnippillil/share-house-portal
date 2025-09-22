"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import {
        ChevronLeftIcon,
        ChevronRightIcon,
        DoubleArrowLeftIcon,
        DoubleArrowRightIcon,
} from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps<TData> {
        table: Table<TData>;
        pageSizeOptions?: number[];
        ariaLabel?: string;
        ariaControls?: string;
        className?: string;
}

export function DataTablePagination<TData>({
        table,
        pageSizeOptions = [10, 20, 50, 100],
        ariaLabel = "Table pagination",
        ariaControls,
        className,
}: DataTablePaginationProps<TData>) {
        const pagination = table.getState().pagination;
        const pageIndex = pagination?.pageIndex ?? 0;
        const pageSize = pagination?.pageSize ?? table.getRowModel().rows.length || pageSizeOptions[0];
        const resolvedPageSizeOptions = React.useMemo(() => {
                const merged = new Set<number>(pageSizeOptions);
                merged.add(pageSize);
                return Array.from(merged).sort((a, b) => a - b);
        }, [pageSize, pageSizeOptions]);
        const pageCount = table.getPageCount() || 1;
        const canPreviousPage = table.getCanPreviousPage();
        const canNextPage = table.getCanNextPage();
        const currentRows = table.getRowModel().rows.length;
        const totalRows =
                typeof table.options.rowCount === "number"
                        ? table.options.rowCount
                        : table.getPrePaginationRowModel().rows.length;
        const firstRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
        const lastRow = totalRows === 0 ? 0 : firstRow + currentRows - 1;

        return (
                <div
                        className={cn(
                                "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
                                className
                        )}
                        role="navigation"
                        aria-label={ariaLabel}
                >
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span className="hidden sm:inline">Rows per page</span>
                                <Select
                                        value={String(pageSize)}
                                        onValueChange={(value) => table.setPageSize(Number(value))}
                                >
                                        <SelectTrigger className="h-8 w-[5.5rem]">
                                                <SelectValue aria-label={`Show ${pageSize} rows`}>
                                                        {pageSize}
                                                </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                                {resolvedPageSizeOptions.map((option) => (
                                                        <SelectItem key={option} value={String(option)}>
                                                                {option}
                                                        </SelectItem>
                                                ))}
                                        </SelectContent>
                                </Select>
                                <span className="whitespace-nowrap">
                                        Showing {firstRow === 0 ? 0 : firstRow}–{lastRow} of {totalRows}
                                </span>
                        </div>
                        <div className="flex items-center gap-1">
                                <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => table.setPageIndex(0)}
                                        disabled={!canPreviousPage}
                                        aria-label="Go to first page"
                                        aria-controls={ariaControls}
                                >
                                        <DoubleArrowLeftIcon aria-hidden="true" className="size-4" />
                                </Button>
                                <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => table.previousPage()}
                                        disabled={!canPreviousPage}
                                        aria-label="Go to previous page"
                                        aria-controls={ariaControls}
                                >
                                        <ChevronLeftIcon aria-hidden="true" className="size-4" />
                                </Button>
                                <span className="px-2 text-sm font-medium text-foreground">
                                        Page {pageIndex + 1} of {pageCount}
                                </span>
                                <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => table.nextPage()}
                                        disabled={!canNextPage}
                                        aria-label="Go to next page"
                                        aria-controls={ariaControls}
                                >
                                        <ChevronRightIcon aria-hidden="true" className="size-4" />
                                </Button>
                                <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => table.setPageIndex(pageCount - 1)}
                                        disabled={!canNextPage}
                                        aria-label="Go to last page"
                                        aria-controls={ariaControls}
                                >
                                        <DoubleArrowRightIcon aria-hidden="true" className="size-4" />
                                </Button>
                        </div>
                </div>
        );
}
