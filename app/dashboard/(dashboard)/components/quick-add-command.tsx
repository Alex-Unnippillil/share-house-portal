"use client"

import { type FormEvent, useMemo, useState, useTransition } from "react"
import { format, parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  parseQuickAddCommand,
  type ParsedQuickAddCommand,
  type QuickAddIssue,
} from "@/lib/dashboard/quick-add-parser"

import { createQuickAddItem } from "../actions/quick-add"

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function describeSummary(data: Partial<ParsedQuickAddCommand>) {
  if (!data.intent) {
    return "We'll show a preview once we understand the intent."
  }

  const parts: string[] = []
  parts.push(data.intent === "invoice" ? "Invoice" : "Task")

  if (data.amount !== undefined) {
    const currency = data.currency ?? "USD"
    parts.push(formatCurrency(data.amount, currency))
  }

  if (data.dueDate) {
    try {
      const formattedDate = format(parseISO(data.dueDate), "MMM d, yyyy")
      parts.push(`due ${formattedDate}`)
    } catch {
      parts.push(`due ${data.dueDate}`)
    }
  }

  return parts.join(" ")
}

function splitIssues(issues: QuickAddIssue[]) {
  return {
    errors: issues.filter((issue) => issue.severity === "error"),
    warnings: issues.filter((issue) => issue.severity === "warning"),
  }
}

export function QuickAddCommand() {
  const [command, setCommand] = useState("")
  const [feedback, setFeedback] = useState<
    | { status: "success"; message: string }
    | { status: "error"; message: string }
    | null
  >(null)
  const [isPending, startTransition] = useTransition()

  const parsing = useMemo(() => parseQuickAddCommand(command), [command])
  const { errors, warnings } = useMemo(
    () => splitIssues(parsing.issues),
    [parsing.issues]
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)

    if (!parsing.isReady || !parsing.data.intent || !parsing.data.dueDate) {
      setFeedback({
        status: "error",
        message: "Add a little more detail so we can create the item.",
      })
      return
    }

    const payload = {
      intent: parsing.data.intent,
      description: parsing.data.description ?? command,
      dueDate: parsing.data.dueDate,
      amount: parsing.data.amount,
      currency: parsing.data.currency,
    }

    startTransition(async () => {
      try {
        await createQuickAddItem(payload)
        setFeedback({
          status: "success",
          message:
            parsing.data.intent === "invoice"
              ? "Invoice queued — we'll notify roommates once it's ready."
              : "Task added to the shared list.",
        })
        setCommand("")
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to create the quick add item."
        setFeedback({ status: "error", message })
      }
    })
  }

  const hasInput = command.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor="quick-add-command" className="text-xs font-medium">
          Quick add command
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="quick-add-command"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="e.g. Invoice $250 due next Friday for utilities"
            aria-describedby="quick-add-feedback"
            disabled={isPending}
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding" : "Add"}
          </Button>
        </div>
      </div>

      <div
        id="quick-add-feedback"
        className="space-y-2 rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground"
      >
        {hasInput ? (
          <div className="space-y-2">
            <p className="font-medium text-foreground">
              {describeSummary(parsing.data)}
            </p>

            {errors.length > 0 && (
              <ul className="space-y-1 text-destructive">
                {errors.map((issue, index) => (
                  <li key={`${issue.field}-${index}`}>{issue.message}</li>
                ))}
              </ul>
            )}

            {warnings.length > 0 && (
              <ul className="space-y-1 text-amber-600">
                {warnings.map((issue, index) => (
                  <li key={`${issue.field}-${index}`}>{issue.message}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p>
            Try phrases like "Invoice $420 due on 8/15 for Jordan" or "Task
            schedule deep clean due in 3 days".
          </p>
        )}

        {feedback && (
          <p
            className={
              feedback.status === "success"
                ? "text-emerald-600"
                : "text-destructive"
            }
          >
            {feedback.message}
          </p>
        )}
      </div>
    </form>
  )
}
