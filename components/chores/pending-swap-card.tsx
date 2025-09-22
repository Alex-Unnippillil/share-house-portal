"use client"

import React, { useMemo, useState, useTransition } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

import type { ChoreAssignment, ChoreSwapWithAssignments, SwapActionResult } from "./types"

type PendingSwapCardProps = {
  swap: ChoreSwapWithAssignments
  viewerId: string
  canRespond: boolean
  acceptAction: (formData: FormData) => Promise<SwapActionResult>
  declineAction: (formData: FormData) => Promise<SwapActionResult>
}

type AssignmentSummary = {
  label: string
  date?: string
  credits?: number
}

const statusVariant: Record<string, "secondary" | "default" | "outline"> = {
  pending: "secondary",
  accepted: "default",
  declined: "outline",
  cancelled: "outline",
}

function buildAssignmentSummary(assignment: ChoreAssignment | null | undefined): AssignmentSummary | null {
  if (!assignment) {
    return null
  }

  return {
    label: assignment.assignment_label,
    date: assignment.assignment_date ?? undefined,
    credits: assignment.credits ?? undefined,
  }
}

function formatAssignment(summary: AssignmentSummary | null): string {
  if (!summary) {
    return "Unspecified chore"
  }

  const parts: string[] = [summary.label]
  if (summary.date) {
    const formatted = new Date(summary.date).toLocaleDateString()
    parts.push(`for ${formatted}`)
  }

  if (typeof summary.credits === "number") {
    parts.push(`(${summary.credits} credits)`)
  }

  return parts.join(" ")
}

function resolveStatusBadge(status: string): "secondary" | "default" | "outline" {
  return statusVariant[status] ?? "outline"
}

export function PendingSwapCard({
  swap,
  viewerId,
  canRespond,
  acceptAction,
  declineAction,
}: PendingSwapCardProps) {
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const viewerIsRequester = swap.requester_id === viewerId
  const otherProfile = viewerIsRequester ? swap.counterparty : swap.requester

  const offeredAssignment = useMemo(
    () =>
      buildAssignmentSummary(
        viewerIsRequester ? swap.requester_assignment ?? null : swap.counterparty_assignment ?? null,
      ),
    [swap.counterparty_assignment, swap.requester_assignment, viewerIsRequester],
  )

  const requestedAssignment = useMemo(
    () =>
      buildAssignmentSummary(
        viewerIsRequester ? swap.counterparty_assignment ?? null : swap.requester_assignment ?? null,
      ),
    [swap.counterparty_assignment, swap.requester_assignment, viewerIsRequester],
  )

  const creditTransferCopy = useMemo(() => {
    if (swap.proposed_credit_transfer <= 0) {
      return "No credit transfer required."
    }

    const source = viewerIsRequester ? "You" : otherProfile?.full_name ?? "The requester"
    const destination = viewerIsRequester ? otherProfile?.full_name ?? "your roommate" : "you"

    return `${source} will transfer ${swap.proposed_credit_transfer} credits to ${destination}.`
  }, [otherProfile?.full_name, swap.proposed_credit_transfer, viewerIsRequester])

  const handleAccept = () => {
    setErrorMessage(null)
    setStatusMessage(null)
    startTransition(async () => {
      const payload = new FormData()
      payload.append("swapId", String(swap.id))
      try {
        const result = await acceptAction(payload)
        if (result.success) {
          setStatusMessage(result.message ?? "Swap accepted. Credits ledger updated.")
        } else {
          setErrorMessage(result.error ?? "Unable to accept swap. Try again later.")
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unexpected error while accepting swap.")
      }
    })
  }

  const handleDecline = () => {
    setErrorMessage(null)
    setStatusMessage(null)
    startTransition(async () => {
      const payload = new FormData()
      payload.append("swapId", String(swap.id))
      const trimmedReason = reason.trim()
      if (trimmedReason.length > 0) {
        payload.append("reason", trimmedReason)
      }

      try {
        const result = await declineAction(payload)
        if (result.success) {
          setStatusMessage(result.message ?? "Swap declined.")
        } else {
          setErrorMessage(result.error ?? "Unable to decline swap. Try again later.")
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unexpected error while declining swap.")
      }
    })
  }

  const respondedAtCopy = swap.responded_at
    ? new Date(swap.responded_at).toLocaleString()
    : null

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>Swap with {otherProfile?.full_name ?? "a roommate"}</CardTitle>
            <CardDescription>
              Exchange {formatAssignment(offeredAssignment)} for {formatAssignment(requestedAssignment)}.
            </CardDescription>
          </div>
          <Badge variant={resolveStatusBadge(swap.status)} className="uppercase">
            {swap.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1">
          <p className="font-medium">What&apos;s on the table</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>
              <span className="font-semibold">You:</span> {formatAssignment(offeredAssignment)}
            </li>
            <li>
              <span className="font-semibold">{otherProfile?.full_name ?? "Roommate"}:</span>{" "}
              {formatAssignment(requestedAssignment)}
            </li>
          </ul>
        </div>
        <Separator />
        <p>{creditTransferCopy}</p>
        {swap.message ? (
          <blockquote className="rounded-md bg-muted/60 p-3 italic text-muted-foreground">
            “{swap.message}”
          </blockquote>
        ) : null}
        {swap.status !== "pending" && respondedAtCopy ? (
          <p className="text-muted-foreground">
            Resolved on <span className="font-medium">{respondedAtCopy}</span>.
          </p>
        ) : null}
        {swap.status === "declined" && swap.decline_reason ? (
          <p className="text-muted-foreground">
            Decline reason: <span className="font-medium">{swap.decline_reason}</span>
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {statusMessage ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        {canRespond ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleAccept} disabled={isPending}>
                {isPending ? "Processing…" : "Accept swap"}
              </Button>
              <Button type="button" variant="outline" onClick={handleDecline} disabled={isPending}>
                {isPending ? "Processing…" : "Decline swap"}
              </Button>
            </div>
            <div className="w-full space-y-2">
              <Label htmlFor={`decline-reason-${swap.id}`}>Decline reason (optional)</Label>
              <Textarea
                id={`decline-reason-${swap.id}`}
                placeholder="Share context so your roommate knows why the swap won&apos;t work."
                value={reason}
                maxLength={280}
                onChange={(event) => setReason(event.target.value)}
                disabled={isPending}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {swap.status === "pending"
              ? viewerIsRequester
                ? "Waiting for your roommate to respond."
                : "You&apos;ll be notified once a decision is made."
              : viewerIsRequester
                ? "This proposal has been processed."
                : "Your response has been recorded."}
          </p>
        )}
      </CardFooter>
    </Card>
  )
}
