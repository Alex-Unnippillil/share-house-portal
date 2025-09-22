"use client"

import { useMemo, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

import { exportLedgerCsv } from "../actions"

interface MonthOption {
  value: string
  label: string
}

interface LedgerDownloadCardProps {
  months: MonthOption[]
  defaultMonth: string
}

export function LedgerDownloadCard({
  months,
  defaultMonth,
}: LedgerDownloadCardProps) {
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [isPending, startTransition] = useTransition()

  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"
    } catch (error) {
      return "UTC"
    }
  }, [])

  const hasMonths = months.length > 0

  const handleDownload = () => {
    if (!hasMonths) {
      return
    }

    startTransition(async () => {
      try {
        const result = await exportLedgerCsv({
          month: selectedMonth,
          timeZone,
        })

        const blob = new Blob([result.csv], {
          type: "text/csv;charset=utf-8",
        })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = result.fileName
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(url)

        toast({
          title: "Export ready",
          description:
            result.entryCount > 0
              ? `Downloaded ${result.entryCount} roommate shares for ${result.monthLabel}.`
              : `No roommate shares were found for ${result.monthLabel}, so a template CSV was downloaded.`,
        })
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong while creating the CSV export."

        toast({
          title: "Export failed",
          description: message,
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export monthly ledger</CardTitle>
        <CardDescription>
          Compile purchases and roommate shares into a CSV snapshot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="ledger-month">
            Month
          </label>
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
            disabled={!hasMonths || isPending}
          >
            <SelectTrigger id="ledger-month" aria-label="Select month">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border border-dashed p-3 text-sm">
          <p className="font-medium text-foreground">Timezone aware export</p>
          <p className="text-muted-foreground">
            Using <span className="font-medium text-foreground">{timeZone}</span> to determine which
            purchases fall into the selected month.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleDownload}
          disabled={!hasMonths || isPending}
          isLoading={isPending}
          className="w-full sm:w-auto"
        >
          Download CSV
        </Button>
      </CardContent>
    </Card>
  )
}
