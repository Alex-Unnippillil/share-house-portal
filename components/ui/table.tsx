"use client"

import React, { createContext, ReactNode, useContext } from "react"

import { cn } from "@/lib/utils"

type TableContextValue = {
  density: "regular" | "compact"
  rowHover: boolean
  stickyHeader: boolean
}

const TableContext = createContext<TableContextValue>({
  density: "regular",
  rowHover: true,
  stickyHeader: false,
})

export function Table({
  children,
  className,
  density = "regular",
  rowHover = true,
  stickyHeader = false,
}: {
  children: ReactNode
  className?: string
  density?: "regular" | "compact"
  rowHover?: boolean
  stickyHeader?: boolean
}) {
  return (
    <TableContext.Provider value={{ density, rowHover, stickyHeader }}>
      <div className={cn("glass-surface glass-border relative w-full overflow-hidden rounded-md", className)}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-separate border-spacing-0 text-left text-sm">
            {children}
          </table>
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background/95 to-transparent md:hidden" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background/95 to-transparent md:hidden" />
      </div>
    </TableContext.Provider>
  )
}

export function TableHeader({ children, className }: { children: ReactNode; className?: string }) {
  const { density, stickyHeader } = useContext(TableContext)

  return (
    <th
      className={cn(
        "border-b border-border/70 bg-background/90 text-left font-medium text-muted-foreground",
        density === "compact" ? "px-4 py-2" : "px-4 py-3",
        stickyHeader && "sticky top-0 z-10 backdrop-blur",
        className,
      )}
      scope="col"
    >
      {children}
    </th>
  )
}

export function TableRow({ children, className }: { children: ReactNode; className?: string }) {
  const { rowHover } = useContext(TableContext)

  return (
    <tr className={cn("border-b border-border/40", rowHover && "hover:bg-muted/30", className)}>{children}</tr>
  )
}

export function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  const { density } = useContext(TableContext)

  return (
    <td className={cn("align-middle", density === "compact" ? "px-4 py-2" : "px-4 py-3", className)}>
      {children}
    </td>
  )
}

export default Table
