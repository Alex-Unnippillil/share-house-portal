import type { CatchUpBalance } from "@/types/payments"

export const catchUpBalances: CatchUpBalance[] = [
  {
    roommateId: "rm_avery",
    roommateName: "Avery Chen",
    unitLabel: "Unit 3B",
    currency: "USD",
    monthlyShare: 1260,
    autopayDay: 1,
    autopayStatus: "active",
    lastPaymentDate: "2024-05-28",
    lastPaymentAmount: 1260,
    charges: [
      {
        id: "rm_avery_rent_june",
        description: "June rent share",
        category: "rent",
        dueDate: "2024-06-01",
        originalAmount: 1260,
        outstandingAmount: 260,
      },
      {
        id: "rm_avery_wifi_june",
        description: "Wi-Fi reimbursement",
        category: "utilities",
        dueDate: "2024-06-12",
        originalAmount: 45,
        outstandingAmount: 45,
      },
      {
        id: "rm_avery_maintenance_june",
        description: "Community maintenance fee",
        category: "maintenance",
        dueDate: "2024-06-18",
        originalAmount: 30,
        outstandingAmount: 30,
      },
    ],
    contacts: {
      primary: {
        name: "Avery Chen",
        email: "avery.chen@example.com",
      },
      roommates: [
        { name: "Jordan Blake", email: "jordan.blake@example.com" },
        { name: "Priya Desai", email: "priya.desai@example.com" },
      ],
      propertyManager: {
        name: "Morgan Ellis",
        email: "morgan.ellis@sharehouse.example",
      },
    },
  },
  {
    roommateId: "rm_jordan",
    roommateName: "Jordan Blake",
    unitLabel: "Unit 3B",
    currency: "USD",
    monthlyShare: 1260,
    autopayDay: 1,
    autopayStatus: "paused",
    lastPaymentDate: "2024-05-12",
    lastPaymentAmount: 800,
    charges: [
      {
        id: "rm_jordan_rent_june",
        description: "June rent share",
        category: "rent",
        dueDate: "2024-06-01",
        originalAmount: 1260,
        outstandingAmount: 480,
      },
      {
        id: "rm_jordan_utilities_may",
        description: "Shared utilities true-up",
        category: "utilities",
        dueDate: "2024-06-10",
        originalAmount: 62,
        outstandingAmount: 62,
      },
      {
        id: "rm_jordan_parking_may",
        description: "Parking spot 17",
        category: "parking",
        dueDate: "2024-05-29",
        originalAmount: 80,
        outstandingAmount: 40,
      },
    ],
    contacts: {
      primary: {
        name: "Jordan Blake",
        email: "jordan.blake@example.com",
      },
      roommates: [
        { name: "Avery Chen", email: "avery.chen@example.com" },
        { name: "Priya Desai", email: "priya.desai@example.com" },
      ],
      propertyManager: {
        name: "Morgan Ellis",
        email: "morgan.ellis@sharehouse.example",
      },
    },
  },
  {
    roommateId: "rm_priya",
    roommateName: "Priya Desai",
    unitLabel: "Unit 3B",
    currency: "USD",
    monthlyShare: 1260,
    autopayDay: 1,
    autopayStatus: "disabled",
    lastPaymentDate: "2024-04-30",
    lastPaymentAmount: 1260,
    charges: [
      {
        id: "rm_priya_rent_june",
        description: "June rent share",
        category: "rent",
        dueDate: "2024-06-01",
        originalAmount: 1260,
        outstandingAmount: 1260,
      },
      {
        id: "rm_priya_supplies_may",
        description: "Household supplies reimbursement",
        category: "fees",
        dueDate: "2024-06-08",
        originalAmount: 38,
        outstandingAmount: 38,
      },
    ],
    contacts: {
      primary: {
        name: "Priya Desai",
        email: "priya.desai@example.com",
      },
      roommates: [
        { name: "Avery Chen", email: "avery.chen@example.com" },
        { name: "Jordan Blake", email: "jordan.blake@example.com" },
      ],
      propertyManager: {
        name: "Morgan Ellis",
        email: "morgan.ellis@sharehouse.example",
      },
    },
  },
]
