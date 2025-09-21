import {
  addDays,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns"

import {
  BookingRow,
  DocumentApprovalRow,
  MaintenanceBacklogSummary,
  MaintenanceRequestRow,
  MessageRow,
  MonthlyCollectionPoint,
  RentCollectionSummary,
  RentPaymentRow,
  VisitorApprovalSummary,
  VisitorLogRow,
} from "./types"

const CLOSED_MAINTENANCE_STATES = new Set(["completed", "cancelled"])

function safeTime(value: string | null | undefined) {
  if (!value) return 0
  try {
    const date = parseISO(value)
    const time = date.getTime()
    return Number.isNaN(time) ? 0 : time
  } catch (error) {
    return 0
  }
}

export function calculateRentCollectionSummary(
  payments: RentPaymentRow[],
): RentCollectionSummary {
  const totals = payments.reduce(
    (acc, payment) => {
      const due = Number(payment.amount_due ?? 0)
      const paid = Number(payment.amount_paid ?? 0)
      return {
        totalDue: acc.totalDue + due,
        totalCollected: acc.totalCollected + paid,
        overdueCount:
          acc.overdueCount + (isPaymentOverdue(payment, paid, due) ? 1 : 0),
      }
    },
    { totalDue: 0, totalCollected: 0, overdueCount: 0 },
  )

  const outstanding = Math.max(totals.totalDue - totals.totalCollected, 0)
  const collectionRate = totals.totalDue
    ? totals.totalCollected / totals.totalDue
    : 1

  return {
    totalDue: totals.totalDue,
    totalCollected: totals.totalCollected,
    outstanding,
    overdueCount: totals.overdueCount,
    collectionRate,
  }
}

function isPaymentOverdue(
  payment: RentPaymentRow,
  paid: number,
  due: number,
) {
  if (paid >= due) return false
  const status = payment.status?.toLowerCase()
  if (status === "overdue" || status === "past_due") return true
  const dueDate = parseISO(payment.due_date)
  return isBefore(dueDate, new Date())
}

export function buildMonthlyCollectionSeries(
  payments: RentPaymentRow[],
  months = 6,
): MonthlyCollectionPoint[] {
  const now = new Date()
  const map = new Map<string, MonthlyCollectionPoint>()

  for (let i = months - 1; i >= 0; i -= 1) {
    const date = subMonths(startOfMonth(now), i)
    const key = format(date, "yyyy-MM")
    map.set(key, { month: format(date, "MMM"), collected: 0 })
  }

  for (const payment of payments) {
    const paidAmount = Number(payment.amount_paid ?? 0)
    if (!paidAmount) continue
    const dueDate = parseISO(payment.due_date)
    if (!isSameMonth(dueDate, now) && dueDate < subMonths(now, months - 1)) {
      continue
    }
    const key = format(startOfMonth(dueDate), "yyyy-MM")
    const bucket = map.get(key)
    if (bucket) {
      bucket.collected += paidAmount
    }
  }

  return Array.from(map.values())
}

export function summarizeMaintenanceRequests(
  requests: MaintenanceRequestRow[],
): MaintenanceBacklogSummary {
  return requests.reduce(
    (summary, request) => {
      const status = request.status?.toLowerCase() ?? ""
      if (CLOSED_MAINTENANCE_STATES.has(status)) {
        return summary
      }

      summary.totalOpen += 1
      const priority = request.priority?.toLowerCase() ?? "unspecified"
      summary.byPriority[priority] = (summary.byPriority[priority] ?? 0) + 1
      return summary
    },
    { totalOpen: 0, byPriority: {} as Record<string, number> },
  )
}

export function summarizeVisitorApprovals(
  visitors: VisitorLogRow[],
): VisitorApprovalSummary {
  const now = new Date()
  const upcomingThreshold = addDays(now, 7)

  return visitors.reduce(
    (acc, visit) => {
      const status = visit.status?.toLowerCase() ?? ""
      if (status === "pending") {
        acc.pendingCount += 1
      }

      if (status === "approved") {
        const arrival = parseISO(visit.arrival_date)
        if (isAfter(arrival, now) && isBefore(arrival, upcomingThreshold)) {
          acc.upcomingVisits += 1
        }
      }

      return acc
    },
    { pendingCount: 0, upcomingVisits: 0 },
  )
}

export function summarizeDocumentApprovals(
  documents: DocumentApprovalRow[],
): DocumentApprovalSummary {
  const now = new Date()
  return documents.reduce(
    (acc, doc) => {
      const status = doc.status?.toLowerCase() ?? ""
      if (status === "pending") {
        acc.pendingCount += 1
        if (doc.due_at) {
          const due = parseISO(doc.due_at)
          if (isBefore(due, now)) {
            acc.overdueCount += 1
          }
        }
      }

      return acc
    },
    { pendingCount: 0, overdueCount: 0 },
  )
}

export function selectUpcomingBookings(bookings: BookingRow[], limit = 5) {
  return bookings
    .slice()
    .sort(
      (a, b) =>
        parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime(),
    )
    .slice(0, limit)
}

export function selectRecentPayments(
  payments: RentPaymentRow[],
  limit = 5,
) {
  return payments
    .slice()
    .filter((payment) => Number(payment.amount_paid ?? 0) > 0)
    .sort((a, b) =>
      safeTime(b.paid_at ?? b.due_date) - safeTime(a.paid_at ?? a.due_date),
    )
    .slice(0, limit)
}

export function selectRecentMessages(messages: MessageRow[], limit = 5) {
  return messages
    .slice()
    .sort((a, b) => safeTime(b.created_at) - safeTime(a.created_at))
    .slice(0, limit)
}

