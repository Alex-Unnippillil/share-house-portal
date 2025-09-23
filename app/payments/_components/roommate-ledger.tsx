"use client"

import { Fragment } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { format, parseISO } from "date-fns"

import Table from "@/components/ui/Table"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, roundToCurrency } from "@/lib/payments/currency"
import { cn } from "@/lib/utils"
import type {
  LedgerActorRole,
  LedgerEntryType,
  RoommateLedger,
} from "@/types/payments"

interface RoommateLedgerProps {
  ledgers: RoommateLedger[]
}

type LedgerRow = RoommateLedger["entries"][number] & { balanceAfter: number }

const ledgerEntryTypeMeta: Record<
  LedgerEntryType,
  { label: string; badgeVariant: BadgeProps["variant"] }
> = {
  contribution: { label: "Contribution", badgeVariant: "complete" },
  adjustment: { label: "Adjustment", badgeVariant: "outline" },
}

const actorRoleLabels: Record<LedgerActorRole, string> = {
  roommate: "Roommate",
  property_manager: "Property manager",
}

function getLedgerColumns(currency: string): ColumnDef<LedgerRow>[] {
  return [
    {
      id: "date",
      header: "Date",
      cell: ({ row }) => {
        const entryDate = parseISO(row.original.date)
        return (
          <div>
            <p className="font-medium">{format(entryDate, "MMM d")}</p>
            <p className="text-xs text-muted-foreground">{format(entryDate, "yyyy")}</p>
          </div>
        )
      },
      size: 150,
      meta: {
        cellClassName: "whitespace-nowrap",
      },
    },
    {
      id: "details",
      header: "Details",
      cell: ({ row }) => {
        const entry = row.original
        return (
          <div className="space-y-1">
            <p className="font-medium">{entry.description}</p>
            <p className="text-xs text-muted-foreground">
              Logged by {entry.actor.name} · {actorRoleLabels[entry.actor.role]}
            </p>
            {entry.note ? (
              <p className="text-xs text-muted-foreground">{entry.note}</p>
            ) : null}
          </div>
        )
      },
      size: 320,
    },
    {
      id: "change",
      header: "Change",
      cell: ({ row }) => {
        const entry = row.original
        const amountClass =
          entry.amount < 0
            ? "text-emerald-600 dark:text-emerald-300"
            : entry.amount > 0
              ? "text-rose-600 dark:text-rose-300"
              : "text-muted-foreground"
        const entryTypeMeta = ledgerEntryTypeMeta[entry.type]

        return (
          <div className="flex flex-col items-end gap-1 text-right">
            <span className={cn("font-semibold", amountClass)}>
              {formatLedgerChange(entry.amount, currency)}
            </span>
            <Badge variant={entryTypeMeta.badgeVariant} className="w-fit">
              {entryTypeMeta.label}
            </Badge>
          </div>
        )
      },
      size: 180,
      meta: {
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
    },
    {
      id: "balance",
      header: "Balance",
      cell: ({ row }) => (
        <div className="text-right">
          <p className="font-semibold">
            {formatCurrency(row.original.balanceAfter, currency)}
          </p>
          <p className="text-xs text-muted-foreground">Running balance</p>
        </div>
      ),
      size: 200,
      meta: {
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
    },
  ]
}

export function RoommateLedger({ ledgers }: RoommateLedgerProps) {
  if (ledgers.length === 0) {
    return null
  }

  const derivedLedgers = ledgers.map((ledger) => {
    let running = roundToCurrency(ledger.startingBalance)
    const rows: LedgerRow[] = ledger.entries.map((entry) => {
      running = roundToCurrency(running + entry.amount)
      return { ...entry, balanceAfter: running }
    })

    return {
      ledger,
      rows,
      currentOutstanding: running,
      contributionsCount: ledger.entries.filter(
        (entry) => entry.type === "contribution",
      ).length,
      adjustmentsCount: ledger.entries.filter(
        (entry) => entry.type === "adjustment",
      ).length,
      lastUpdated: rows.at(-1)?.date ?? null,
    }
  })

  const sortedLedgers = [...derivedLedgers].sort(
    (a, b) => b.currentOutstanding - a.currentOutstanding,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roomsily ledger</CardTitle>
        <CardDescription>
          Track individual roommate contributions alongside property manager
          adjustments for a shared source of truth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-10">
        {sortedLedgers.map(
          (
            {
              ledger,
              rows,
              currentOutstanding,
              contributionsCount,
              adjustmentsCount,
              lastUpdated,
            },
            index,
          ) => {
            const lastUpdatedLabel = lastUpdated
              ? format(parseISO(lastUpdated), "MMM d, yyyy")
              : null
            const contributionsCopy =
              contributionsCount === 1
                ? "1 contribution"
                : `${contributionsCount} contributions`
            const adjustmentsCopy =
              adjustmentsCount === 1
                ? "1 adjustment"
                : `${adjustmentsCount} adjustments`

            return (
              <Fragment key={ledger.roommateId}>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{ledger.roommateName}</p>
                      <p className="text-xs text-muted-foreground">
                        {ledger.unitLabel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {contributionsCopy} · {adjustmentsCopy}
                      </p>
                      {lastUpdatedLabel ? (
                        <p className="text-xs text-muted-foreground">
                          Last activity {lastUpdatedLabel}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase text-muted-foreground">
                        Outstanding
                      </p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(currentOutstanding, ledger.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Started at {formatCurrency(ledger.startingBalance, ledger.currency)}
                      </p>
                    </div>
                  </div>
                  <Table
                    columns={getLedgerColumns(ledger.currency)}
                    data={rows}
                    tableId={`ledger-${ledger.roommateId}`}
                    emptyState="No ledger activity recorded yet."
                  />
                </div>
                {index < sortedLedgers.length - 1 ? <Separator /> : null}
              </Fragment>
            )
          },
        )}
      </CardContent>
    </Card>
  )
}

function formatLedgerChange(amount: number, currency: string): string {
  if (amount === 0) {
    return formatCurrency(0, currency)
  }

  const prefix = amount > 0 ? "+" : "-"
  return `${prefix}${formatCurrency(Math.abs(amount), currency)}`
}
