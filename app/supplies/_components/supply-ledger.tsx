"use client"

import { FormEvent, useMemo, useState, useTransition } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/payments/currency"
import type {
  SupplyShareLedgerEntry,
  SupplyShareSettlementMethod,
  SupplyShareStatus,
} from "@/types/supplies"

import { settleSupplyShare } from "../actions"

interface SupplyLedgerProps {
  shares: SupplyShareLedgerEntry[]
}

const statusCopy: Record<SupplyShareStatus, { label: string; variant: "secondary" | "complete" }> = {
  open: { label: "Open", variant: "secondary" },
  settled: { label: "Settled", variant: "complete" },
}

const methodCopy: Record<SupplyShareSettlementMethod, string> = {
  off_app: "Settled off platform",
  rent_roll_in: "Rolled into next rent invoice",
}

function formatDisplayDate(value?: string | null, includeTime = false) {
  if (!value) {
    return ""
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ""
  }

  return format(parsed, includeTime ? "MMM d, yyyy p" : "MMM d, yyyy")
}

export function SupplyLedger({ shares }: SupplyLedgerProps) {
  const router = useRouter()
  const [isSettlementDialogOpen, setSettlementDialogOpen] = useState(false)
  const [selectedShare, setSelectedShare] = useState<SupplyShareLedgerEntry | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<SupplyShareSettlementMethod>("off_app")
  const [invoiceId, setInvoiceId] = useState("")
  const [note, setNote] = useState("")
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [historyShare, setHistoryShare] = useState<SupplyShareLedgerEntry | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasShares = shares.length > 0

  const openSettlementDialog = (
    share: SupplyShareLedgerEntry,
    method: SupplyShareSettlementMethod = "off_app",
  ) => {
    setSelectedShare(share)
    setSelectedMethod(method)
    setInvoiceId("")
    setNote("")
    setSettlementDialogOpen(true)
  }

  const openHistoryDialog = (share: SupplyShareLedgerEntry) => {
    setHistoryShare(share)
    setHistoryDialogOpen(true)
  }

  const disableSubmit = useMemo(() => {
    if (!selectedShare) {
      return true
    }

    if (selectedMethod === "rent_roll_in") {
      return invoiceId.trim().length === 0 || isPending
    }

    return isPending
  }, [selectedShare, selectedMethod, invoiceId, isPending])

  const handleSettleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedShare) {
      return
    }

    const trimmedNote = note.trim()
    const trimmedInvoice = invoiceId.trim()

    startTransition(async () => {
      try {
        await settleSupplyShare({
          shareId: selectedShare.id,
          method: selectedMethod,
          note: trimmedNote.length > 0 ? trimmedNote : undefined,
          invoiceId:
            selectedMethod === "rent_roll_in" && trimmedInvoice.length > 0
              ? trimmedInvoice
              : undefined,
        })

        toast({
          title: "Share settled",
          description:
            selectedMethod === "rent_roll_in"
              ? `Rolled ${selectedShare.roommateName}'s share into rent invoice ${trimmedInvoice}.`
              : `Marked ${selectedShare.roommateName}'s share as settled off platform.`,
        })

        setSettlementDialogOpen(false)
        setSelectedShare(null)
        setNote("")
        setInvoiceId("")
        router.refresh()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to update the supply share."
        toast({
          variant: "destructive",
          title: "Settlement failed",
          description: message,
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Supply share ledger</CardTitle>
          <CardDescription>
            Manage reimbursements for communal supplies and keep everyone aligned on how shares were settled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasShares ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Share</th>
                    <th className="px-4 py-3 font-semibold">Roommate</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map((share) => {
                    const statusMeta = statusCopy[share.status]
                    return (
                      <tr key={share.id} className="border-b last:border-0">
                        <td className="px-4 py-4 align-top">
                          <div className="font-medium text-foreground">{share.description}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Created {formatDisplayDate(share.createdAt)}
                            {share.createdBy ? ` • ${share.createdByName}` : ""}
                          </div>
                          {share.settlementNote ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Note: {share.settlementNote}
                            </p>
                          ) : null}
                          {share.settlementInvoiceId ? (
                            <p className="text-xs text-muted-foreground">
                              Invoice: {share.settlementInvoiceId}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="font-medium">{share.roommateName}</div>
                          {share.settledBy && share.status === "settled" ? (
                            <p className="text-xs text-muted-foreground">
                              Settled by {share.settledByName}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 text-right align-top font-semibold">
                          {formatCurrency(share.amount, share.currency)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                          {share.settlementMethod ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {methodCopy[share.settlementMethod]}
                              {share.settledAt ? ` • ${formatDisplayDate(share.settledAt)}` : ""}
                            </p>
                          ) : share.status === "settled" && share.settledAt ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Settled {formatDisplayDate(share.settledAt)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 text-right align-top">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openHistoryDialog(share)}
                            >
                              History
                            </Button>
                            {share.status === "open" ? (
                              <Button
                                size="sm"
                                onClick={() => openSettlementDialog(share)}
                                disabled={isPending && selectedShare?.id === share.id}
                              >
                                Mark settled
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3 py-16 text-center">
              <p className="text-base font-medium text-foreground">No supply shares yet</p>
              <p className="text-sm text-muted-foreground">
                Add household purchases to start tracking what each roommate owes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isSettlementDialogOpen}
        onOpenChange={(open) => {
          setSettlementDialogOpen(open)
          if (!open) {
            setSelectedShare(null)
            setNote("")
            setInvoiceId("")
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Settle share</DialogTitle>
            <DialogDescription>
              {selectedShare
                ? `Update ${selectedShare.roommateName}'s ${selectedShare.description.toLowerCase()} share.`
                : "Update the selected share."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSettleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settlement-method">
                Settlement method
              </label>
              <Select value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as SupplyShareSettlementMethod)}>
                <SelectTrigger id="settlement-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off_app">Settled off platform</SelectItem>
                  <SelectItem value="rent_roll_in">Roll into next rent invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedMethod === "rent_roll_in" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="invoice-id">
                  Rent invoice ID
                </label>
                <Input
                  id="invoice-id"
                  placeholder="e.g. INV-2024-0612"
                  value={invoiceId}
                  onChange={(event) => setInvoiceId(event.target.value)}
                  disabled={isPending}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settlement-note">
                Optional note
              </label>
              <Textarea
                id="settlement-note"
                placeholder="Share any context for this settlement (visible to roommates)."
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={280}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                {note.length}/280 characters
              </p>
            </div>
            <DialogFooter className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSettlementDialogOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={disableSubmit}>
                {isPending ? "Saving..." : "Confirm settlement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={historyDialogOpen}
        onOpenChange={(open) => {
          setHistoryDialogOpen(open)
          if (!open) {
            setHistoryShare(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Settlement history</DialogTitle>
            <DialogDescription>
              {historyShare
                ? `${historyShare.roommateName}'s ${historyShare.description.toLowerCase()} share`
                : "Review settlement events."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {historyShare && historyShare.auditTrail.length > 0 ? (
              historyShare.auditTrail.map((event) => (
                <div key={event.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold capitalize">
                      {event.eventType.replace(/_/g, " ")}
                      {event.newStatus ? (
                        <Badge variant={event.newStatus === "settled" ? "complete" : "secondary"}>
                          {event.newStatus}
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDisplayDate(event.createdAt, true)}
                    </span>
                  </div>
                  <Separator className="my-3" />
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      {event.createdByName ? `By ${event.createdByName}` : "System generated"}
                      {event.settlementMethod ? ` • ${methodCopy[event.settlementMethod]}` : ""}
                      {event.settlementInvoiceId ? ` • Invoice ${event.settlementInvoiceId}` : ""}
                    </p>
                    {event.note ? <p>Note: {event.note}</p> : null}
                    {event.context && Object.keys(event.context).length > 0 ? (
                      <div className="rounded-md bg-muted/40 p-3 text-xs">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(event.context, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No audit activity has been recorded for this share yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
