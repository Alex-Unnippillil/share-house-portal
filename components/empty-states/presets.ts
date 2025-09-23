import type { EmptyStateSampleItem } from "./EmptyState"

export const DOCUMENTS_EMPTY_STATE_ROUTE = "/documents/upload";

export const DOCUMENTS_EMPTY_STATE_SAMPLES: EmptyStateSampleItem[] = [
  {
    title: "Lease agreement — Unit 2A",
    description: "Documenso template for the primary roommate lease this season.",
    metadata: "Pending signatures",
  },
  {
    title: "Pet policy addendum",
    description: "Tracks approvals for roommates bringing new pets into the unit.",
    metadata: "Awaiting review",
  },
  {
    title: "Move-in checklist",
    description: "Shared acknowledgment of keys, parking passes, and storage lockers.",
    metadata: "Signed",
  },
];

export const MEMBERS_EMPTY_STATE_ROUTE = "/dashboard/members/create";

export const MEMBERS_EMPTY_STATE_SAMPLES: EmptyStateSampleItem[] = [
  {
    title: "Avery Johnson",
    description: "Property manager overseeing billing, documents, and messaging.",
    metadata: "Role · admin",
  },
  {
    title: "Skylar Chen",
    description: "Roommate contributing $950 monthly via autopay.",
    metadata: "Status · active",
  },
  {
    title: "Jordan Patel",
    description: "Invited roommate awaiting onboarding tasks.",
    metadata: "Status · invited",
  },
];

export const ROOMMATE_LEDGER_EMPTY_STATE_ROUTE = "/payments/catch-up";

export const ROOMMATE_LEDGER_EMPTY_STATE_SAMPLES: EmptyStateSampleItem[] = [
  {
    title: "Jamie Rivera",
    description: "Autopay posted $950 for July rent and utilities.",
    metadata: "Balance · $120 due",
  },
  {
    title: "Morgan Lee",
    description: "Property manager logged a $45 internet reimbursement.",
    metadata: "Balance · $0",
  },
  {
    title: "Priya Desai",
    description: "Manual catch-up payment scheduled for the 15th.",
    metadata: "Balance · $340 due",
  },
];
