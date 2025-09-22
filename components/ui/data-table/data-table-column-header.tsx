"use client";

import * as React from "react";
import { Column } from "@tanstack/react-table";
import {
        ArrowDownIcon,
        ArrowUpIcon,
        CaretSortIcon,
        DotsHorizontalIcon,
        PinLeftIcon,
        PinRightIcon,
} from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuSeparator,
        DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue> {
        column: Column<TData, TValue>;
        title: React.ReactNode;
        className?: string;
        enablePinning?: boolean;
}

export function DataTableColumnHeader<TData, TValue>({
        column,
        title,
        className,
        enablePinning = true,
}: DataTableColumnHeaderProps<TData, TValue>) {
        const canSort = column.getCanSort();
        const canPin = enablePinning && column.getCanPin();
        const sorted = column.getIsSorted();
        const isPinned = column.getIsPinned();
        const titleText =
                typeof title === "string"
                        ? title
                        : React.isValidElement(title) && typeof title.props.children === "string"
                        ? title.props.children
                        : "column";

        const renderSortIcon = () => {
                if (!canSort) {
                        return null;
                }
                if (sorted === "asc") {
                        return <ArrowUpIcon aria-hidden="true" className="size-3.5" />;
                }
                if (sorted === "desc") {
                        return <ArrowDownIcon aria-hidden="true" className="size-3.5" />;
                }
                return <CaretSortIcon aria-hidden="true" className="size-3.5" />;
        };

        return (
                <div className={cn("flex w-full items-center justify-between gap-2", className)}>
                        {canSort ? (
                                <button
                                        type="button"
                                        className="group inline-flex items-center gap-1 text-left font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        onClick={column.getToggleSortingHandler()}
                                        aria-label={`Sort ${titleText}`}
                                        aria-live="polite"
                                >
                                        <span>{title}</span>
                                        {renderSortIcon()}
                                </button>
                        ) : (
                                <span className="font-medium text-foreground">{title}</span>
                        )}

                        {(canSort || canPin) && (
                                <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                                <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-7"
                                                        aria-label={`Column options for ${titleText}`}
                                                >
                                                        <DotsHorizontalIcon aria-hidden="true" className="size-4" />
                                                </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-44">
                                                {canSort ? (
                                                        <>
                                                                <DropdownMenuItem
                                                                        onSelect={() => column.toggleSorting(false)}
                                                                        aria-label="Sort ascending"
                                                                >
                                                                        <ArrowUpIcon className="mr-2 size-4" aria-hidden="true" />
                                                                        Sort ascending
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                        onSelect={() => column.toggleSorting(true)}
                                                                        aria-label="Sort descending"
                                                                >
                                                                        <ArrowDownIcon className="mr-2 size-4" aria-hidden="true" />
                                                                        Sort descending
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                        disabled={!sorted}
                                                                        onSelect={() => column.clearSorting()}
                                                                        aria-label="Clear sorting"
                                                                >
                                                                        <CaretSortIcon className="mr-2 size-4" aria-hidden="true" />
                                                                        Clear sorting
                                                                </DropdownMenuItem>
                                                        </>
                                                ) : null}
                                                {canPin ? <DropdownMenuSeparator /> : null}
                                                {canPin ? (
                                                        <>
                                                                <DropdownMenuItem
                                                                        disabled={isPinned === "left"}
                                                                        onSelect={() => column.pin("left")}
                                                                        aria-label="Pin column to the left"
                                                                >
                                                                        <PinLeftIcon className="mr-2 size-4" aria-hidden="true" />
                                                                        Pin to left
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                        disabled={isPinned === "right"}
                                                                        onSelect={() => column.pin("right")}
                                                                        aria-label="Pin column to the right"
                                                                >
                                                                        <PinRightIcon className="mr-2 size-4" aria-hidden="true" />
                                                                        Pin to right
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                        disabled={!isPinned}
                                                                        onSelect={() => column.pin(false)}
                                                                        aria-label="Unpin column"
                                                                >
                                                                        <DotsHorizontalIcon
                                                                                className="mr-2 size-4 rotate-90"
                                                                                aria-hidden="true"
                                                                        />
                                                                        Unpin
                                                                </DropdownMenuItem>
                                                        </>
                                                ) : null}
                                        </DropdownMenuContent>
                                </DropdownMenu>
                        )}
                </div>
        );
}
