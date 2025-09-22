import { sleep } from "@/lib/utils"

export type RentDueSummary = {
  amountDue: number
  dueDate: string
  autopayEnabled: boolean
  outstandingBalance: number
}

export type BookingStat = {
  label: string
  value: string
  trend: "up" | "down" | "neutral"
}

export type DocumentSummary = {
  id: string
  name: string
  updatedAt: string
  status: "signed" | "pending" | "draft"
}

export type RoommateMessage = {
  id: string
  author: string
  body: string
  postedAt: string
}

const NETWORK_LATENCY = {
  rent: 150,
  bookings: 380,
  documents: 420,
  messages: 260,
}

export async function fetchRentDueSummary(): Promise<RentDueSummary> {
  await sleep(NETWORK_LATENCY.rent)

  const dueDate = new Date()
  if (dueDate.getDate() > 1) {
    dueDate.setMonth(dueDate.getMonth() + 1)
  }
  dueDate.setDate(1)

  return {
    amountDue: 1260,
    dueDate: dueDate.toISOString(),
    autopayEnabled: true,
    outstandingBalance: 0,
  }
}

export async function fetchBookingStats(): Promise<BookingStat[]> {
  await sleep(NETWORK_LATENCY.bookings)

  return [
    { label: "This week", value: "8 bookings", trend: "up" },
    { label: "Avg duration", value: "1.7 hours", trend: "neutral" },
    { label: "Peak day", value: "Saturday", trend: "neutral" },
  ]
}

export async function fetchRecentDocuments(limit = 3): Promise<DocumentSummary[]> {
  await sleep(NETWORK_LATENCY.documents)

  const now = new Date()

  const documents: DocumentSummary[] = [
    {
      id: "lease-v2",
      name: "Lease agreement v2.pdf",
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      status: "signed",
    },
    {
      id: "house-rules",
      name: "House rules.pdf",
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      status: "pending",
    },
    {
      id: "parking-pass",
      name: "Parking pass instructions.pdf",
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 11).toISOString(),
      status: "draft",
    },
  ]

  return documents.slice(0, limit)
}

export async function fetchRoommateMessages(limit = 4): Promise<RoommateMessage[]> {
  await sleep(NETWORK_LATENCY.messages)

  const now = new Date()

  const messages: RoommateMessage[] = [
    {
      id: "wifi-restart",
      author: "Jordan",
      body: "Wi-Fi was acting up so I rebooted the router. All good now!",
      postedAt: new Date(now.getTime() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: "parking-swap",
      author: "Avery",
      body: "Anyone open to swapping parking spots this weekend?",
      postedAt: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: "visitor-update",
      author: "Sam",
      body: "Heads up that my sister is staying Friday night—submitted the visitor form.",
      postedAt: new Date(now.getTime() - 1000 * 60 * 60 * 9).toISOString(),
    },
    {
      id: "chores",
      author: "Morgan",
      body: "Reminder: it's our unit's week for the kitchen deep clean!",
      postedAt: new Date(now.getTime() - 1000 * 60 * 60 * 27).toISOString(),
    },
  ]

  return messages.slice(0, limit)
}
