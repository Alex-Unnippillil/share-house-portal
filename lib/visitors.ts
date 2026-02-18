import { differenceInCalendarDays } from "date-fns"

export interface VisitorPolicy {
  maxConsecutiveNights: number
  requiresManagerApproval: boolean
  blackoutWindows: Array<{ start: string; end: string; reason?: string }>
}

export interface VisitorPolicyEvaluationInput {
  checkInDate: Date
  checkOutDate: Date
  currentUnitActiveStays: Array<{
    checkInDate: string
    checkOutDate: string
    status: "pending" | "approved" | "rejected" | "completed"
  }>
}

export interface VisitorPolicyEvaluationResult {
  allowed: boolean
  consecutiveNights: number
  violations: string[]
}

export function evaluateVisitorPolicy(
  policy: VisitorPolicy,
  input: VisitorPolicyEvaluationInput
): VisitorPolicyEvaluationResult {
  const violations: string[] = []
  const consecutiveNights = differenceInCalendarDays(
    input.checkOutDate,
    input.checkInDate
  )

  if (consecutiveNights <= 0) {
    violations.push("Departure must be after arrival")
  }

  if (consecutiveNights > policy.maxConsecutiveNights) {
    violations.push(
      `Stay exceeds max consecutive nights (${policy.maxConsecutiveNights})`
    )
  }

  const overlaps = input.currentUnitActiveStays.some((stay) => {
    if (stay.status === "rejected") return false
    const existingStart = new Date(stay.checkInDate)
    const existingEnd = new Date(stay.checkOutDate)
    return input.checkInDate < existingEnd && input.checkOutDate > existingStart
  })

  if (overlaps) {
    violations.push("Requested stay overlaps an existing approved/pending visitor window")
  }

  const blackoutHit = policy.blackoutWindows.find((window) => {
    const start = new Date(window.start)
    const end = new Date(window.end)
    return input.checkInDate < end && input.checkOutDate > start
  })

  if (blackoutHit) {
    violations.push(
      blackoutHit.reason
        ? `Requested stay overlaps blackout window: ${blackoutHit.reason}`
        : "Requested stay overlaps blackout window"
    )
  }

  return {
    allowed: violations.length === 0,
    consecutiveNights,
    violations,
  }
}

export interface VisitorCsvRow {
  guestName: string
  hostName: string
  hostRoommateName: string
  arrivalDate: string
  departureDate: string
  reason: string
  status: string
  requiresApproval: boolean
  approvedAt: string
  createdAt: string
}

function escapeCsvCell(value: string) {
  const needsEscape = /[",\n]/.test(value)
  if (!needsEscape) return value
  return `"${value.replace(/"/g, '""')}"`
}

export function createVisitorLogCsv(rows: VisitorCsvRow[]) {
  const headers = [
    "Guest Name",
    "Host",
    "Host Roommate",
    "Arrival",
    "Departure",
    "Reason",
    "Status",
    "Manager Approval Required",
    "Approved At",
    "Submitted At",
  ]

  const lines = rows.map((row) =>
    [
      row.guestName,
      row.hostName,
      row.hostRoommateName,
      row.arrivalDate,
      row.departureDate,
      row.reason,
      row.status,
      row.requiresApproval ? "yes" : "no",
      row.approvedAt,
      row.createdAt,
    ]
      .map((cell) => escapeCsvCell(cell))
      .join(",")
  )

  return [headers.join(","), ...lines].join("\n")
}
