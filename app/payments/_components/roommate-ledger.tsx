import { Fragment } from "react"
import { format, parseISO } from "date-fns"

import { Badge, type BadgeProps } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-states/EmptyState"
import {
  ROOMMATE_LEDGER_EMPTY_STATE_ROUTE,
  ROOMMATE_LEDGER_EMPTY_STATE_SAMPLES,
} from "@/components/empty-states/presets"
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
import { PiggyBank } from "lucide-react"

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

export function RoommateLedger({ ledgers }: RoommateLedgerProps) {
  if (ledgers.length === 0) {
    return (
      <EmptyState
        surface="payments:roommate-ledger"
        className="w-full"
        title="Start tracking roommate balances"
        description="Log contributions and adjustments so every roommate sees the same running total."
        illustration={<PiggyBank className="size-12 text-muted-foreground" />}
        sampleItems={ROOMMATE_LEDGER_EMPTY_STATE_SAMPLES}
        primaryAction={{
          href: ROOMMATE_LEDGER_EMPTY_STATE_ROUTE,
          label: "Create",
        }}
      />
    )
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
                  {rows.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border">
                      <div className="grid grid-cols-[110px_minmax(0,1fr)_140px_140px] bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-[120px_minmax(0,1fr)_150px_150px]">
                        <span>Date</span>
                        <span>Details</span>
                        <span className="text-right">Change</span>
                        <span className="text-right">Balance</span>
                      </div>
                      <div className="[&>div:not(:last-child)]:border-b">
                        {rows.map((entry) => {
                          const entryDate = parseISO(entry.date)
                          const formattedDate = format(entryDate, "MMM d")
                          const formattedYear = format(entryDate, "yyyy")
                          const amountClass =
                            entry.amount < 0
                              ? "text-emerald-600"
                              : entry.amount > 0
                                ? "text-rose-600"
                                : "text-muted-foreground"
                          const entryTypeMeta = ledgerEntryTypeMeta[entry.type]

                          return (
                            <div
                              key={entry.id}
                              className="grid grid-cols-[110px_minmax(0,1fr)_140px_140px] gap-x-4 px-4 py-3 text-sm sm:grid-cols-[120px_minmax(0,1fr)_150px_150px]"
                            >
                              <div>
                                <p className="font-medium">{formattedDate}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formattedYear}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="font-medium">{entry.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  Logged by {entry.actor.name} ·
                                  {" "}
                                  {actorRoleLabels[entry.actor.role]}
                                </p>
                                {entry.note ? (
                                  <p className="text-xs text-muted-foreground">
                                    {entry.note}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex flex-col items-end gap-1 text-right">
                                <span className={cn("font-semibold", amountClass)}>
                                  {formatLedgerChange(entry.amount, ledger.currency)}
                                </span>
                                <Badge
                                  variant={entryTypeMeta.badgeVariant}
                                  className="w-fit"
                                >
                                  {entryTypeMeta.label}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  {formatCurrency(entry.balanceAfter, ledger.currency)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Running balance
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
                      No ledger activity recorded yet.
                    </div>
                  )}
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
