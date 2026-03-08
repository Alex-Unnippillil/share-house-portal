import { format, parseISO } from 'date-fns'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/payments/currency'
import {
  SupplyLedgerMemberPosition,
  SupplyLedgerEntry,
  getSupplyLedgerData,
} from '@/lib/supplies/ledger'

import { LedgerFilters, MonthOption } from './_components/ledger-filters'

const DEFAULT_CURRENCY = 'USD'

interface LedgerPageProps {
  searchParams?: {
    month?: string | string[]
  }
}

function formatMonthOption(value: string): MonthOption {
  try {
    const label = format(parseISO(`${value}-01`), 'MMMM yyyy')
    return { value, label }
  } catch (error) {
    return { value, label: value }
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  try {
    return format(parseISO(value), 'MMM d, yyyy')
  } catch (error) {
    return value.split('T')[0] ?? value
  }
}

function groupMembers(
  positions: SupplyLedgerMemberPosition[],
  variant: 'owed' | 'owing'
): SupplyLedgerMemberPosition[] {
  const filtered = positions.filter((position) =>
    variant === 'owed' ? position.totalOwed > 0 : position.totalOwing > 0
  )

  const sorted = filtered.sort((a, b) => {
    const aTotal = variant === 'owed' ? a.totalOwed : a.totalOwing
    const bTotal = variant === 'owed' ? b.totalOwed : b.totalOwing
    return bTotal - aTotal
  })

  return sorted
}

function LedgerGroupCard({
  title,
  description,
  members,
  variant,
}: {
  title: string
  description: string
  members: SupplyLedgerMemberPosition[]
  variant: 'owed' | 'owing'
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everyone is square — no unsettled shares.</p>
        ) : (
          <ul className="space-y-4">
            {members.map((member) => {
              const total = variant === 'owed' ? member.totalOwed : member.totalOwing
              const entries = variant === 'owed' ? member.owedEntries : member.owingEntries

              return (
                <li
                  key={member.profileId}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-muted/30 p-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{member.displayName}</p>
                    {entries.slice(0, 3).map((entry) => (
                      <p key={`${entry.shareId}-${variant}`} className="text-xs text-muted-foreground">
                        {entry.supplyName} ·
                        {variant === 'owed'
                          ? ` Owes ${entry.creditor.name}`
                          : ` Owed by ${entry.debtor.name}`}{' '}
                        ({formatCurrency(entry.amount, DEFAULT_CURRENCY)})
                      </p>
                    ))}
                    {entries.length > 3 ? (
                      <p className="text-xs text-muted-foreground">
                        +{entries.length - 3} more item{entries.length - 3 === 1 ? '' : 's'}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatCurrency(total, DEFAULT_CURRENCY)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entries.length} unsettled share{entries.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function LedgerTable({ entries }: { entries: SupplyLedgerEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supply ledger</CardTitle>
          <CardDescription>Track cost splits and reimbursement status.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No unsettled shares right now. Add a new supply purchase to populate the ledger.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supply ledger</CardTitle>
        <CardDescription>Itemised view of every unsettled supply share.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Supply</th>
              <th className="px-4 py-3 text-left font-semibold">Owes</th>
              <th className="px-4 py-3 text-left font-semibold">Owed to</th>
              <th className="px-4 py-3 text-left font-semibold">Purchased</th>
              <th className="px-4 py-3 text-left font-semibold">Due</th>
              <th className="px-4 py-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.shareId} className="border-b last:border-b-0">
                <td className="px-4 py-3 align-top">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{entry.supplyName}</p>
                    {entry.note ? (
                      <p className="text-xs text-muted-foreground">{entry.note}</p>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="space-y-1">
                    <p className="font-medium">{entry.debtor.name}</p>
                    {entry.debtor.email ? (
                      <p className="text-xs text-muted-foreground">{entry.debtor.email}</p>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="space-y-1">
                    <p className="font-medium">{entry.creditor.name}</p>
                    {entry.creditor.email ? (
                      <p className="text-xs text-muted-foreground">{entry.creditor.email}</p>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">{formatDate(entry.purchasedAt)}</td>
                <td className="px-4 py-3 align-top">{formatDate(entry.dueDate)}</td>
                <td className="px-4 py-3 text-right align-top font-semibold">
                  {formatCurrency(entry.amount, DEFAULT_CURRENCY)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

export default async function SupplyLedgerPage({ searchParams }: LedgerPageProps) {
  const rawMonth = Array.isArray(searchParams?.month)
    ? searchParams?.month[0]
    : searchParams?.month

  const ledger = await getSupplyLedgerData({ month: rawMonth })

  const monthOptions = ledger.availableMonths.map(formatMonthOption)
  const owedMembers = groupMembers(ledger.positions, 'owed')
  const owingMembers = groupMembers(ledger.positions, 'owing')

  return (
    <div className="container max-w-6xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Supply ledger</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Review unsettled supply splits, see who owes what, and export a CSV snapshot for reconciliations.
          </p>
        </div>
        <LedgerFilters months={monthOptions} selectedMonth={ledger.selectedMonth} />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(ledger.totals.totalOutstanding, DEFAULT_CURRENCY)}
            </p>
            <p className="text-xs text-muted-foreground">
              Across {ledger.totals.totalEntries} unsettled share
              {ledger.totals.totalEntries === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Roommates who owe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{ledger.totals.roommatesWhoOwe}</p>
            <p className="text-xs text-muted-foreground">With open reimbursements due</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Roommates owed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{ledger.totals.roommatesOwedTo}</p>
            <p className="text-xs text-muted-foreground">Awaiting repayment from others</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <LedgerGroupCard
          title="You owe"
          description="Roommates and supply shares you still need to reimburse."
          members={owedMembers}
          variant="owed"
        />
        <LedgerGroupCard
          title="Roommates owe you"
          description="Balances other roommates need to settle with you."
          members={owingMembers}
          variant="owing"
        />
      </section>

      <LedgerTable entries={ledger.entries} />
    </div>
  )
}
