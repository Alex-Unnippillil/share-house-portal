"use client";

import * as React from "react";
import {
        ColumnDef,
        ColumnPinningState,
        OnChangeFn,
        PaginationState,
        SortingState,
        Table as TableInstance,
        flexRender,
        getCoreRowModel,
        getPaginationRowModel,
        getSortedRowModel,
        useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@/lib/utils";

import { DataTablePagination } from "./data-table-pagination";

export type DataTableState = Partial<{
        sorting: SortingState;
        pagination: PaginationState;
        columnPinning: ColumnPinningState;
}>;

export interface DataTableProps<TData, TValue> {
        columns: ColumnDef<TData, TValue>[];
        data: TData[];
        pageCount?: number;
        rowCount?: number;
        state?: DataTableState;
        onSortingChange?: OnChangeFn<SortingState>;
        onPaginationChange?: OnChangeFn<PaginationState>;
        onColumnPinningChange?: OnChangeFn<ColumnPinningState>;
        manualSorting?: boolean;
        manualPagination?: boolean;
        enableColumnPinning?: boolean;
        estimateRowHeight?: number;
        overscan?: number;
        pageSizeOptions?: number[];
        isLoading?: boolean;
        emptyState?: React.ReactNode;
        caption?: React.ReactNode;
        className?: string;
        tableClassName?: string;
        bodyClassName?: string;
        bodyHeight?: number | string;
        renderPagination?: (table: TableInstance<TData>) => React.ReactNode;
        getRowId?: (originalRow: TData, index: number) => string;
}

function getManualState<T>(value: T | undefined, fallback: T | undefined) {
        return value === undefined ? fallback : value;
}

export function DataTable<TData, TValue>({
        columns,
        data,
        pageCount,
        rowCount,
        state,
        onSortingChange,
        onPaginationChange,
        onColumnPinningChange,
        manualSorting,
        manualPagination,
        enableColumnPinning = true,
        estimateRowHeight = 48,
        overscan = 5,
        pageSizeOptions,
        isLoading = false,
        emptyState,
        caption,
        className,
        tableClassName,
        bodyClassName,
        bodyHeight = "60vh",
        renderPagination,
        getRowId,
}: DataTableProps<TData, TValue>) {
        const tableId = React.useId();

        const resolvedManualSorting = getManualState(manualSorting, Boolean(onSortingChange));
        const resolvedManualPagination = getManualState(
                manualPagination,
                Boolean(onPaginationChange)
        );

        const tableState = React.useMemo(() => {
                if (!state) return undefined;
                const nextState: DataTableState = {};
                if (state.sorting !== undefined) {
                        nextState.sorting = state.sorting;
                }
                if (state.pagination !== undefined) {
                        nextState.pagination = state.pagination;
                }
                if (state.columnPinning !== undefined) {
                        nextState.columnPinning = state.columnPinning;
                }
                return nextState;
        }, [state]);

        const table = useReactTable({
                data,
                columns,
                state: tableState,
                onSortingChange,
                onPaginationChange,
                onColumnPinningChange,
                enableColumnPinning,
                manualSorting: resolvedManualSorting,
                manualPagination: resolvedManualPagination,
                pageCount,
                rowCount,
                getCoreRowModel: getCoreRowModel(),
                getSortedRowModel: resolvedManualSorting ? undefined : getSortedRowModel(),
                getPaginationRowModel: resolvedManualPagination ? undefined : getPaginationRowModel(),
                getRowId,
        });

        const containerRef = React.useRef<HTMLDivElement>(null);
        const rows = table.getRowModel().rows;
        const rowVirtualizer = useVirtualizer({
                count: rows.length,
                getScrollElement: () => containerRef.current,
                estimateSize: () => estimateRowHeight,
                overscan,
        });

        const virtualRows = rowVirtualizer.getVirtualItems();
        const totalSize = rowVirtualizer.getTotalSize();
        const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start ?? 0 : 0;
        const paddingBottom = virtualRows.length > 0 ? totalSize - (virtualRows.at(-1)?.end ?? totalSize) : 0;

        const columnCount = table.getVisibleLeafColumns().length;
        const paginationState = table.getState().pagination;
        const baseRowIndex = React.useMemo(() => {
                if (!paginationState) {
                        return 0;
                }
                return (paginationState.pageIndex ?? 0) * (paginationState.pageSize ?? rows.length);
        }, [paginationState, rows.length]);

        const leftPinnedColumns = table.getState().columnPinning?.left ?? [];
        const rightPinnedColumns = table.getState().columnPinning?.right ?? [];
        const leftOffsets = new Map<string, number>();
        let runningLeftOffset = 0;
        for (const columnId of leftPinnedColumns) {
                const column = table.getColumn(columnId);
                if (!column || !column.getIsVisible()) continue;
                leftOffsets.set(columnId, runningLeftOffset);
                runningLeftOffset += column.getSize();
        }

        const rightOffsets = new Map<string, number>();
        let runningRightOffset = 0;
        for (const columnId of rightPinnedColumns) {
                const column = table.getColumn(columnId);
                if (!column || !column.getIsVisible()) continue;
                rightOffsets.set(columnId, runningRightOffset);
                runningRightOffset += column.getSize();
        }

        const focusRow = React.useCallback(
                (index: number) => {
                        if (!containerRef.current) return;
                        requestAnimationFrame(() => {
                                const target = containerRef.current?.querySelector<HTMLElement>(
                                        `[data-row-index="${index}"]`
                                );
                                target?.focus();
                        });
                },
                []
        );

        const handleRowKeyDown = React.useCallback(
                (event: React.KeyboardEvent<HTMLTableRowElement>, rowIndex: number) => {
                        if (event.defaultPrevented || rows.length === 0) return;
                        if (event.key === "ArrowDown") {
                                event.preventDefault();
                                const nextIndex = Math.min(rowIndex + 1, rows.length - 1);
                                rowVirtualizer.scrollToIndex(nextIndex, { align: "start" });
                                if (nextIndex !== rowIndex) {
                                        focusRow(nextIndex);
                                }
                        } else if (event.key === "ArrowUp") {
                                event.preventDefault();
                                const prevIndex = Math.max(rowIndex - 1, 0);
                                rowVirtualizer.scrollToIndex(prevIndex, { align: "start" });
                                if (prevIndex !== rowIndex) {
                                        focusRow(prevIndex);
                                }
                        }
                },
                [focusRow, rowVirtualizer, rows.length]
        );

        const renderPinningStyles = (columnId: string, pinState: "left" | "right" | false) => {
                if (pinState === "left") {
                        return {
                                position: "sticky" as const,
                                left: leftOffsets.get(columnId) ?? 0,
                                zIndex: 1,
                                backgroundColor: "hsl(var(--background))",
                        };
                }
                if (pinState === "right") {
                        return {
                                position: "sticky" as const,
                                right: rightOffsets.get(columnId) ?? 0,
                                zIndex: 1,
                                backgroundColor: "hsl(var(--background))",
                        };
                }
                return {};
        };

        const tablePagination = React.useMemo(() => {
                if (renderPagination) {
                        return renderPagination(table);
                }
                return (
                        <DataTablePagination
                                ariaControls={tableId}
                                table={table}
                                pageSizeOptions={pageSizeOptions}
                        />
                );
        }, [pageSizeOptions, renderPagination, table, tableId]);

        const emptyContent = emptyState ?? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                        No results found.
                </div>
        );

        const resolvedRowCount = rowCount ?? rows.length;

        return (
                <div className={cn("space-y-4", className)}>
                        <div
                                ref={containerRef}
                                className={cn(
                                        "relative overflow-auto rounded-md border border-border bg-background",
                                        bodyClassName
                                )}
                                style={{ maxHeight: bodyHeight }}
                                aria-live="polite"
                                aria-busy={isLoading ? "true" : undefined}
                        >
                                <table
                                        id={tableId}
                                        role="grid"
                                        aria-colcount={columnCount}
                                        aria-rowcount={resolvedRowCount}
                                        className={cn(
                                                "min-w-full border-collapse text-sm [&_th]:bg-muted/60",
                                                tableClassName
                                        )}
                                >
                                        {caption ? <caption className="sr-only">{caption}</caption> : null}
                                        <thead className="sticky top-0 z-10">
                                                {table.getHeaderGroups().map((headerGroup) => (
                                                        <tr key={headerGroup.id} role="row">
                                                                {headerGroup.headers.map((header) => {
                                                                        const isPinned = header.column.getIsPinned();
                                                                        const pinningStyles = renderPinningStyles(
                                                                                header.column.id,
                                                                                isPinned
                                                                        );
                                                                        return (
                                                                                <th
                                                                                        key={header.id}
                                                                                        role="columnheader"
                                                                                        scope="col"
                                                                                        className={cn(
                                                                                                "h-12 px-4 text-left align-middle font-semibold text-foreground",
                                                                                                isPinned &&
                                                                                                        "border-r border-border bg-background"
                                                                                        )}
                                                                                        style={{
                                                                                                width: header.getSize(),
                                                                                                minWidth: header.column.columnDef.minSize,
                                                                                                ...pinningStyles,
                                                                                        }}
                                                                                        aria-sort={
                                                                                                header.column.getIsSorted() === "asc"
                                                                                                        ? "ascending"
                                                                                                        : header.column.getIsSorted() ===
                                                                                                          "desc"
                                                                                                                ? "descending"
                                                                                                                : "none"
                                                                                        }
                                                                                >
                                                                                        {header.isPlaceholder
                                                                                                ? null
                                                                                                : flexRender(
                                                                                                          header.column.columnDef.header,
                                                                                                          header.getContext()
                                                                                                  )}
                                                                                </th>
                                                                        );
                                                                })}
                                                        </tr>
                                                ))}
                                        </thead>
                                        <tbody role="rowgroup">
                                                {paddingTop > 0 ? (
                                                        <tr aria-hidden="true">
                                                                <td colSpan={columnCount} style={{ height: paddingTop }} />
                                                        </tr>
                                                ) : null}
                                                {virtualRows.map((virtualRow) => {
                                                        const row = rows[virtualRow.index];
                                                        return (
                                                                <tr
                                                                        key={row.id}
                                                                        role="row"
                                                                        data-row-index={row.index}
                                                                        tabIndex={0}
                                                                        aria-rowindex={baseRowIndex + row.index + 1}
                                                                        className="even:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                        onKeyDown={(event) => handleRowKeyDown(event, row.index)}
                                                                >
                                                                        {row.getVisibleCells().map((cell) => {
                                                                                const isPinned = cell.column.getIsPinned();
                                                                                const pinningStyles = renderPinningStyles(
                                                                                        cell.column.id,
                                                                                        isPinned
                                                                                );
                                                                                return (
                                                                                        <td
                                                                                                key={cell.id}
                                                                                                role="gridcell"
                                                                                                className={cn(
                                                                                                        "h-12 px-4 align-middle",
                                                                                                        isPinned && "bg-background"
                                                                                                )}
                                                                                                style={{
                                                                                                        width: cell.column.getSize(),
                                                                                                        minWidth:
                                                                                                                cell.column.columnDef.minSize,
                                                                                                        ...pinningStyles,
                                                                                                }}
                                                                                        >
                                                                                                {flexRender(
                                                                                                        cell.column.columnDef.cell,
                                                                                                        cell.getContext()
                                                                                                )}
                                                                                        </td>
                                                                                );
                                                                        })}
                                                                </tr>
                                                        );
                                                })}
                                                {paddingBottom > 0 ? (
                                                        <tr aria-hidden="true">
                                                                <td colSpan={columnCount} style={{ height: paddingBottom }} />
                                                        </tr>
                                                ) : null}
                                                {!rows.length && !isLoading ? (
                                                        <tr>
                                                                <td colSpan={columnCount}>{emptyContent}</td>
                                                        </tr>
                                                ) : null}
                                        </tbody>
                                </table>
                                {isLoading ? (
                                        <div className="absolute inset-x-0 bottom-2 flex justify-center">
                                                <span className="rounded-full bg-background px-3 py-1 text-xs text-muted-foreground shadow">
                                                        Loading…
                                                </span>
                                        </div>
                                ) : null}
                        </div>
                        {tablePagination}
                </div>
        );
}
