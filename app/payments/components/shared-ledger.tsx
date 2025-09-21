"use client"

import { useMemo, useState } from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type Roommate = {
  id: string
  name: string
  share: number
}

type LedgerEntryType = "contribution" | "adjustment"
type LedgerEntryImpact = "credit" | "debit"
type LedgerStatus = "Cleared" | "Pending" | "Posted"

type LedgerEntry = {
  id: string
  postedAt: string
  entry: string
  type: LedgerEntryType
  impact: LedgerEntryImpact
  amount: number
  status: LedgerStatus
  method?: string
  appliesTo: "all" | Roommate["id"]
  party: {
    name: string
    role: "roommate" | "property_manager"
  }
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
})

const cycle = {
  id: "2024-06",
  label: "June 2024 rent cycle",
  totalDue: 3600,
}

const roommates: Roommate[] = [
  { id: "alex-chen", name: "Alex Chen", share: 0.3 },
  { id: "jordan-lee", name: "Jordan Lee", share: 0.25 },
  { id: "samira-patel", name: "Samira Patel", share: 0.25 },
  { id: "devon-wright", name: "Devon Wright", share: 0.2 },
]

const ledgerEntries: LedgerEntry[] = [
  {
    id: "lx-001",
    postedAt: "2024-06-01T08:05:00-04:00",
    entry: "June rent - Alex Chen",
    type: "contribution",
    impact: "credit",
    amount: 1080,
    status: "Cleared",
    method: "Autopay • Checking (…2841)",
    appliesTo: "alex-chen",
    party: {
      name: "Alex Chen",
      role: "roommate",
    },
  },
  {
    id: "lx-002",
    postedAt: "2024-06-01T09:15:00-04:00",
    entry: "June rent - Jordan Lee",
    type: "contribution",
    impact: "credit",
    amount: 900,
    status: "Cleared",
    method: "Autopay • Visa (…9024)",
    appliesTo: "jordan-lee",
    party: {
      name: "Jordan Lee",
      role: "roommate",
    },
  },
  {
    id: "lx-003",
    postedAt: "2024-06-01T11:20:00-04:00",
    entry: "June rent - Samira Patel (partial)",
    type: "contribution",
    impact: "credit",
    amount: 600,
    status: "Cleared",
    method: "Autopay • Checking (…0042)",
    appliesTo: "samira-patel",
    party: {
      name: "Samira Patel",
      role: "roommate",
    },
  },
  {
    id: "lx-004",
    postedAt: "2024-06-02T09:45:00-04:00",
    entry: "June rent catch-up - Samira Patel",
    type: "contribution",
    impact: "credit",
    amount: 300,
    status: "Pending",
    method: "Manual payment scheduled for 6/04",
    appliesTo: "samira-patel",
    party: {
      name: "Samira Patel",
      role: "roommate",
    },
  },
  {
    id: "lx-005",
    postedAt: "2024-06-02T07:52:00-04:00",
    entry: "June rent - Devon Wright",
    type: "contribution",
    impact: "credit",
    amount: 720,
    status: "Cleared",
    method: "Autopay • Checking (…1177)",
    appliesTo: "devon-wright",
    party: {
      name: "Devon Wright",
      role: "roommate",
    },
  },
  {
    id: "lx-006",
    postedAt: "2024-06-03T13:10:00-04:00",
    entry: "Utility reconciliation - May electric overage",
    type: "adjustment",
    impact: "debit",
    amount: 64,
    status: "Posted",
    method: "Manager note: split equally ($16 each)",
    appliesTo: "all",
    party: {
      name: "Morgan Price",
      role: "property_manager",
    },
  },
  {
    id: "lx-007",
    postedAt: "2024-06-04T08:30:00-04:00",
    entry: "Cleaning supply reimbursement",
    type: "adjustment",
    impact: "credit",
    amount: 45,
    status: "Cleared",
    method: "Credited back to Alex Chen",
    appliesTo: "alex-chen",
    party: {
      name: "Morgan Price",
      role: "property_manager",
    },
  },
  {
    id: "lx-008",
    postedAt: "2024-06-05T10:12:00-04:00",
    entry: "Late fee waiver - Jordan Lee",
    type: "adjustment",
    impact: "credit",
    amount: 25,
    status: "Cleared",
    method: "Waived after on-time proof",
    appliesTo: "jordan-lee",
    party: {
      name: "Morgan Price",
      role: "property_manager",
    },
  },
  {
    id: "lx-009",
    postedAt: "2024-06-05T16:40:00-04:00",
    entry: "Appliance downtime credit",
    type: "adjustment",
    impact: "credit",
    amount: 120,
    status: "Posted",
    method: "Applies to all roommates ($30 each)",
    appliesTo: "all",
    party: {
      name: "Morgan Price",
      role: "property_manager",
    },
  },
  {
    id: "lx-010",
    postedAt: "2024-06-06T09:03:00-04:00",
    entry: "Parking add-on - Devon Wright",
    type: "adjustment",
    impact: "debit",
    amount: 50,
    status: "Posted",
    method: "Reserved spot P2B",
    appliesTo: "devon-wright",
    party: {
      name: "Morgan Price",
      role: "property_manager",
    },
  },
]

const roommateFilters = [
  { id: "all", label: "All roommates" },
  ...roommates.map((roommate) => ({ id: roommate.id, label: roommate.name })),
]

const statusStyles: Record<LedgerStatus, string> = {
  Cleared:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-200",
  Pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-200",
  Posted:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-500/10 dark:text-sky-200",
}

const typeStyles: Record<LedgerEntryType, string> = {
  contribution:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-200",
  adjustment:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-500/10 dark:text-indigo-200",
}

type DerivedLedgerEntry = LedgerEntry & {
  runningBalance: number
  signedAmount: number
  affectsBalance: boolean
}

type RoommateSummary = Roommate & {
  expected: number
  clearedContributions: number
  pendingContributions: number
  credits: number
  debits: number
  netManagerAdjustment: number
  balance: number
  progressValue: number
}

const formatCurrency = (value: number) => currencyFormatter.format(value)

const formatSignedCurrency = (value: number) => {
  const absolute = currencyFormatter.format(Math.abs(value))
  if (value > 0) return `+${absolute}`
  if (value < 0) return `-${absolute}`
  return absolute
}

export default function SharedLedger() {
  const [roommateFilter, setRoommateFilter] = useState<string>("all")
  const [entryTypeFilter, setEntryTypeFilter] = useState<"all" | LedgerEntryType>("all")

  const { entriesWithBalance, summary } = useMemo(() => {
    const sorted = [...ledgerEntries].sort(
      (a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime(),
    )

    let balance = cycle.totalDue
    let clearedContributions = 0
    let pendingContributions = 0
    let managerCredits = 0
    let managerDebits = 0

    const derived: DerivedLedgerEntry[] = sorted.map((entry) => {
      if (entry.type === "contribution") {
        if (entry.status === "Pending") {
          pendingContributions += entry.amount
        } else {
          clearedContributions += entry.amount
        }
      } else if (entry.type === "adjustment") {
        if (entry.impact === "credit") {
          managerCredits += entry.amount
        } else {
          managerDebits += entry.amount
        }
      }

      const affectsBalance =
        entry.type === "contribution" ? entry.status !== "Pending" : true

      if (affectsBalance) {
        balance += entry.impact === "credit" ? -entry.amount : entry.amount
      }

      const signedAmount = entry.impact === "credit" ? -entry.amount : entry.amount

      return {
        ...entry,
        runningBalance: balance,
        signedAmount,
        affectsBalance,
      }
    })

    return {
      entriesWithBalance: derived,
      summary: {
        balance,
        clearedContributions,
        pendingContributions,
        managerCredits,
        managerDebits,
      },
    }
  }, [])

  const roommateSummaries = useMemo<RoommateSummary[]>(() => {
    return roommates.map((roommate) => {
      const expected = cycle.totalDue * roommate.share
      let clearedContributions = 0
      let pendingContributions = 0
      let credits = 0
      let debits = 0

      for (const entry of ledgerEntries) {
        if (entry.type === "contribution" && entry.appliesTo === roommate.id) {
          if (entry.status === "Pending") {
            pendingContributions += entry.amount
          } else {
            clearedContributions += entry.amount
          }
        }

        if (entry.type === "adjustment") {
          const appliesToRoommate =
            entry.appliesTo === "all" || entry.appliesTo === roommate.id

          if (!appliesToRoommate) continue

          const portion =
            entry.appliesTo === "all"
              ? entry.amount / roommates.length
              : entry.amount

          if (entry.impact === "credit") {
            credits += portion
          } else {
            debits += portion
          }
        }
      }

      const netManagerAdjustment = credits - debits
      const target = expected - netManagerAdjustment
      const progressValue =
        target <= 0
          ? 100
          : Math.min(100, Math.round((clearedContributions / target) * 100))

      const balance = expected - netManagerAdjustment - clearedContributions

      return {
        ...roommate,
        expected,
        clearedContributions,
        pendingContributions,
        credits,
        debits,
        netManagerAdjustment,
        balance,
        progressValue: Number.isFinite(progressValue) ? progressValue : 0,
      }
    })
  }, [])

  const visibleEntries = useMemo(() => {
    return entriesWithBalance.filter((entry) => {
      const matchesRoommate =
        roommateFilter === "all" ||
        entry.appliesTo === "all" ||
        entry.appliesTo === roommateFilter

      const matchesType =
        entryTypeFilter === "all" || entry.type === entryTypeFilter

      return matchesRoommate && matchesType
    })
  }, [entriesWithBalance, roommateFilter, entryTypeFilter])

  const projectedBalance = summary.balance - summary.pendingContributions
  const netManagerAdjustments = summary.managerCredits - summary.managerDebits
  const projectedBalanceLabel =
    projectedBalance < 0 ? "credit" : projectedBalance === 0 ? "settled" : "due"

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Shared ledger
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Monitor how every roommate contribution interacts with property manager
          adjustments for the {cycle.label.toLowerCase()}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total due ({cycle.label})</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {formatCurrency(cycle.totalDue)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Base rent expected across the household.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cleared roommate contributions</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {formatCurrency(summary.clearedContributions)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Autopay and manual payments that have settled.</p>
            {summary.pendingContributions > 0 && (
              <p className="text-xs">
                Pending contributions: {formatCurrency(summary.pendingContributions)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Manager adjustments</CardDescription>
            <CardTitle
              className={cn(
                "text-3xl font-semibold",
                netManagerAdjustments >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {formatSignedCurrency(netManagerAdjustments)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Credits {formatCurrency(summary.managerCredits)} · Debits {formatCurrency(summary.managerDebits)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Current balance</CardDescription>
            <CardTitle
              className={cn(
                "text-3xl font-semibold",
                summary.balance <= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-foreground",
              )}
            >
              {formatCurrency(summary.balance)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Outstanding after cleared activity.</p>
            <p className="text-xs">
              Projected after pending: {formatCurrency(projectedBalance)} ({projectedBalanceLabel})
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Roommate breakdown</CardTitle>
          <CardDescription>
            Compare expected shares, cleared payments, and adjustments for each roommate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {roommateSummaries.map((roommate) => {
              const adjustmentLabel = formatSignedCurrency(roommate.netManagerAdjustment)
              const roommateBalanceLabel =
                roommate.balance < 0 ? "credit" : roommate.balance === 0 ? "settled" : "due"
              return (
                <div
                  key={roommate.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{roommate.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(roommate.share * 100)}% share • Expected {formatCurrency(roommate.expected)}
                      </p>
                    </div>
                    <Progress value={roommate.progressValue} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Cleared</span>
                      <span>{formatCurrency(roommate.clearedContributions)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Adjustments</span>
                      <span
                        className={cn(
                          roommate.netManagerAdjustment >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400",
                        )}
                      >
                        {adjustmentLabel}
                      </span>
                    </div>
                    {roommate.pendingContributions > 0 && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Pending</span>
                        <span>{formatCurrency(roommate.pendingContributions)}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Balance</span>
                      <div className="text-right">
                        <p
                          className={cn(
                            roommate.balance <= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-foreground",
                          )}
                        >
                          {formatCurrency(roommate.balance)}
                        </p>
                        <p className="text-xs font-normal text-muted-foreground">
                          {roommateBalanceLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Ledger activity</CardTitle>
            <CardDescription>
              Detailed log of roommate payments and property manager adjustments.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Select value={roommateFilter} onValueChange={setRoommateFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="All roommates" />
              </SelectTrigger>
              <SelectContent>
                {roommateFilters.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={entryTypeFilter}
              onValueChange={(value) => setEntryTypeFilter(value as "all" | LedgerEntryType)}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="All activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All activity</SelectItem>
                <SelectItem value="contribution">Contributions</SelectItem>
                <SelectItem value="adjustment">Adjustments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea>
            <div className="min-w-[760px] divide-y divide-border">
              <div className="grid grid-cols-[120px_minmax(220px,1fr)_minmax(120px,140px)_minmax(140px,1fr)_160px] bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Date</span>
                <span>Entry</span>
                <span>Amount</span>
                <span>Running balance</span>
                <span>Recorded by</span>
              </div>
              {visibleEntries.length === 0 ? (
                <div className="px-4 py-8 text-sm text-muted-foreground">
                  No activity matches the selected filters yet.
                </div>
              ) : (
                visibleEntries.map((entry) => {
                  const icon = entry.impact === "credit" ? (
                    <ArrowDownRight className="size-4 text-emerald-500" />
                  ) : (
                    <ArrowUpRight className="size-4 text-rose-500" />
                  )

                  const amountClasses = cn(
                    "font-medium",
                    entry.signedAmount < 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : entry.signedAmount > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-muted-foreground",
                  )

                  const balanceClasses = cn(
                    "font-medium",
                    entry.runningBalance <= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground",
                  )

                  const formattedDate = dateFormatter.format(new Date(entry.postedAt))
                  const formattedTime = timeFormatter.format(new Date(entry.postedAt))

                  return (
                    <div
                      key={entry.id}
                      className="grid grid-cols-[120px_minmax(220px,1fr)_minmax(120px,140px)_minmax(140px,1fr)_160px] p-4 text-sm"
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{formattedDate}</div>
                        <div className="text-xs text-muted-foreground">{formattedTime}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="mt-1">{icon}</span>
                          <div>
                            <p className="font-medium text-foreground">{entry.entry}</p>
                            {entry.method && (
                              <p className="text-xs text-muted-foreground">{entry.method}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge className={cn("border", typeStyles[entry.type])}>{entry.type === "contribution" ? "Contribution" : "Adjustment"}</Badge>
                          <Badge className={cn("border", statusStyles[entry.status])}>{entry.status}</Badge>
                          <Badge variant="outline" className="border-dashed">
                            {entry.appliesTo === "all" ? "All roommates" : roommates.find((roommate) => roommate.id === entry.appliesTo)?.name ?? "Roommate"}
                          </Badge>
                        </div>
                      </div>
                      <div className={amountClasses}>{formatCurrency(entry.signedAmount)}</div>
                      <div className={balanceClasses}>{formatCurrency(entry.runningBalance)}</div>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{entry.party.name}</div>
                        <div className="text-xs capitalize text-muted-foreground">
                          {entry.party.role.replace("_", " ")}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </section>
  )
}
