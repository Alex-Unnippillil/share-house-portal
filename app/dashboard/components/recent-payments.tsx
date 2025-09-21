"use client"

import { format, parseISO } from "date-fns"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import type { RentPaymentRow } from "../lib/types"

type RecentPaymentsProps = {
  payments: RentPaymentRow[]
  canView: boolean
}

export function RecentPayments({ payments, canView }: RecentPaymentsProps) {
  if (!canView) {
    return (
      <p className="text-sm text-muted-foreground">
        Payment history is restricted for this role.
      </p>
    )
  }

  if (!payments.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No recent rent receipts to display.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {payments.map((payment) => (
        <div key={payment.id} className="flex items-center">
          <Avatar className="size-9">
            <AvatarImage
              src={`/avatars/${(payment.unit_id ?? "0").slice(0, 2)}.png`}
              alt="Tenant avatar"
            />
            <AvatarFallback>
              {(payment.unit_id ?? "? ").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">
              {payment.unit_id ? `Unit ${payment.unit_id}` : "Unassigned unit"}
            </p>
            <p className="text-xs text-muted-foreground">
              Posted {format(parseISO(payment.paid_at ?? payment.due_date), "MMM d, yyyy")}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm font-semibold text-foreground">
              ${Number(payment.amount_paid ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {payment.status}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

