import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type StatusDomain = "payment" | "booking" | "maintenance" | "notification"

type StatusStyles = {
  label: string
  className: string
}

const statusTokens: Record<StatusDomain, Record<string, StatusStyles>> = {
  payment: {
    paid: {
      label: "Paid",
      className: "bg-payment-paid/15 text-payment-paid border-payment-paid/30",
    },
    pending: {
      label: "Pending",
      className:
        "bg-payment-pending/15 text-payment-pending border-payment-pending/30",
    },
    failed: {
      label: "Failed",
      className:
        "bg-payment-failed/15 text-payment-failed border-payment-failed/30",
    },
    refunded: {
      label: "Refunded",
      className:
        "bg-payment-refunded/15 text-payment-refunded border-payment-refunded/30",
    },
  },
  booking: {
    confirmed: {
      label: "Confirmed",
      className:
        "bg-booking-confirmed/15 text-booking-confirmed border-booking-confirmed/30",
    },
    pending: {
      label: "Pending",
      className:
        "bg-booking-pending/15 text-booking-pending border-booking-pending/30",
    },
    conflict: {
      label: "Conflict",
      className:
        "bg-booking-conflict/15 text-booking-conflict border-booking-conflict/30",
    },
    cancelled: {
      label: "Cancelled",
      className:
        "bg-booking-cancelled/15 text-booking-cancelled border-booking-cancelled/30",
    },
  },
  maintenance: {
    open: {
      label: "Open",
      className:
        "bg-maintenance-open/15 text-maintenance-open border-maintenance-open/30",
    },
    inProgress: {
      label: "In progress",
      className:
        "bg-maintenance-inProgress/15 text-maintenance-inProgress border-maintenance-inProgress/30",
    },
    blocked: {
      label: "Blocked",
      className:
        "bg-maintenance-blocked/15 text-maintenance-blocked border-maintenance-blocked/30",
    },
    resolved: {
      label: "Resolved",
      className:
        "bg-maintenance-resolved/15 text-maintenance-resolved border-maintenance-resolved/30",
    },
  },
  notification: {
    info: {
      label: "Info",
      className:
        "bg-notification-info/15 text-notification-info border-notification-info/30",
    },
    success: {
      label: "Success",
      className:
        "bg-notification-success/15 text-notification-success border-notification-success/30",
    },
    warning: {
      label: "Warning",
      className:
        "bg-notification-warning/15 text-notification-warning border-notification-warning/30",
    },
    error: {
      label: "Error",
      className:
        "bg-notification-error/15 text-notification-error border-notification-error/30",
    },
  },
}

export type StatusBadgeProps = {
  domain: StatusDomain
  status: string
  className?: string
}

export function StatusBadge({ domain, status, className }: StatusBadgeProps) {
  const style = statusTokens[domain][status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  }

  return (
    <Badge
      className={cn(
        "border text-label-sm font-medium capitalize",
        style.className,
        className
      )}
      variant="outline"
    >
      {style.label}
    </Badge>
  )
}
