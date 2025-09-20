import type { StaffOperationsState } from "@/types/staff"

import { nowIsoString } from "./utils"

export const createSampleStaffOperationsState = (): StaffOperationsState => {
  const now = new Date()
  const isoNow = nowIsoString()
  return {
    version: 1,
    checklist: {
      incidentLogged: false,
      packageIntake: false,
      shiftLogUpdated: false,
      timeTracked: false,
      visitorSignIn: false,
      workOrderUpdated: false,
    },
    incidents: [
      {
        actionsTaken: "Reset fire panel and notified facilities director.",
        description: "Smoke detector triggered in laundry room due to dryer lint build up.",
        id: "incident-seed-1",
        location: "Laundry Room",
        occurredAt: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
        reportedBy: "Jordan",
        severity: "minor",
        title: "Laundry smoke alert",
        witnesses: "Resident #204",
        attachments: [],
      },
    ],
    packages: [
      {
        carrier: "UPS",
        id: "1Z999AA10123456784",
        location: "Package Room Shelf B",
        notes: "Oversized box, request dolly for pickup.",
        recipient: "Alex Rivera",
        receivedAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
        status: "received",
        trackingNumber: "1Z999AA10123456784",
      },
      {
        carrier: "USPS",
        id: "9400-1111-2222-3333",
        location: "Locker 3",
        recipient: "Jamie Chen",
        receivedAt: new Date(now.getTime() - 1000 * 60 * 90).toISOString(),
        status: "notified",
        trackingNumber: "9400-1111-2222-3333",
      },
    ],
    shiftLog: [
      {
        author: "Taylor",
        followUp: "Confirm HVAC tech arrival ETA at 11:00.",
        id: "shift-seed-1",
        role: "Night Supervisor",
        summary: "Quiet overnight. Received two package deliveries for 5A/12C.",
        timestamp: new Date(now.getTime() - 1000 * 60 * 50).toISOString(),
        type: "handover",
      },
    ],
    timeTracking: {
      activeSessions: [
        {
          breaks: [],
          id: "session-seed-1",
          notes: "Covering lobby + package intake",
          role: "Front Desk",
          staffName: "Morgan",
          startedAt: new Date(now.getTime() - 1000 * 60 * 25).toISOString(),
        },
      ],
      history: [],
    },
    visitors: [
      {
        badgeNumber: "A17",
        checkIn: new Date(now.getTime() - 1000 * 60 * 20).toISOString(),
        company: "Bright Cleaners",
        host: "Unit 8D",
        id: "visitor-seed-1",
        name: "Pat Lee",
        purpose: "Weekly housekeeping",
        status: "checked_in",
      },
    ],
    workOrders: {
      completed: [],
      in_progress: [
        {
          category: "maintenance",
          details: "Awaiting part delivery from supplier. Residents updated via email.",
          id: "work-order-seed-1",
          priority: "high",
          requestedBy: "Unit 3C",
          status: "in_progress",
          title: "HVAC not cooling",
          unit: "3C",
          updatedAt: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
        },
      ],
      new: [
        {
          category: "cleaning",
          details: "Spill reported near elevators, needs mop bucket.",
          id: "work-order-seed-2",
          priority: "medium",
          requestedBy: "Security",
          status: "new",
          title: "Clean elevator lobby",
          unit: "Lobby",
          updatedAt: isoNow,
        },
      ],
    },
  }
}
