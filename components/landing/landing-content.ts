import {
  BellRing,
  CalendarClock,
  FileText,
  ListChecks,
  MessageSquare,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react"

export const integrationBadges = ["Stripe Billing", "Supabase Realtime", "Cal.com", "Documenso"]

export const heroMetrics = [
  { value: "99.2%", label: "Rent collected on schedule", icon: PiggyBank },
  { value: "8 min", label: "Average roommate onboarding", icon: Users },
  { value: "5x", label: "Fewer amenity conflicts", icon: ListChecks },
]

export const heroHighlights = [
  {
    title: "Autopay everyone trusts",
    description:
      "Stripe splits rent automatically, nudges late roommates, and stores a transparent receipt history.",
    icon: Wallet,
  },
  {
    title: "Bookings without friction",
    description:
      "Roommates tap a Cal.com link to hold the kitchen, parking, or gaming nook with real-time conflict checks.",
    icon: CalendarClock,
  },
  {
    title: "Signal over noise",
    description:
      "Threads, polls, and visitor approvals surface the updates that matter so every roommate stays in sync.",
    icon: BellRing,
  },
]

export const portalFeatures = [
  {
    title: "Shared rent autopay",
    description:
      "Stripe Billing handles every roommate split while Supabase keeps the ledger, receipts, and reminders aligned.",
    icon: Wallet,
    href: "/payments",
    ctaLabel: "Review payments",
  },
  {
    title: "Household scheduling",
    description:
      "Embed Cal.com for kitchens, gaming nights, and parking so bookings respect household rules in real time.",
    icon: CalendarClock,
    href: "/bookings",
    ctaLabel: "Book amenities",
  },
  {
    title: "Lease & doc vault",
    description:
      "Documenso workflows send, sign, and archive every agreement with roommate-level access controls.",
    icon: FileText,
    href: "/documents",
    ctaLabel: "Manage documents",
  },
  {
    title: "Roommate message feed",
    description:
      "Supabase realtime threads keep announcements, polls, and repairs transparent across every device.",
    icon: MessageSquare,
    href: "/messaging",
    ctaLabel: "Open messaging",
  },
  {
    title: "Visitor guardrails",
    description:
      "Collect overnight guest details, route approvals, and log entries with policy checks baked in.",
    icon: ShieldCheck,
    href: "/visitors",
    ctaLabel: "Review policies",
  },
  {
    title: "Insights & rituals",
    description:
      "Surface renewals, chores, and maintenance cadences so the household stays proactive instead of reactive.",
    icon: Sparkles,
    href: "/dashboard",
    ctaLabel: "View dashboard",
  },
]

export const personaPlaybooks = [
  {
    badge: "Roommates",
    title: "A calmer home hub",
    description:
      "Track rent, chores, and shared spaces from a mobile-first portal that respects everyone’s time.",
    points: [
      "Automatic rent splits with clear history and reminders for each roommate",
      "A personalised daily agenda of bookings, chores, and open polls",
      "Visitor check-ins and document vaults that remove guesswork",
    ],
  },
  {
    badge: "Property teams",
    title: "Operations with context",
    description:
      "Connect leasing, finance, and community updates to lower churn and support happier households.",
    points: [
      "Stripe, Supabase, and Documenso data aligned in one control centre",
      "Real-time alerts when payments slip or maintenance escalates",
      "Exports, audit trails, and permissions tuned for compliance",
    ],
  },
]

export const integrationHighlights = [
  {
    title: "Finance spine with Stripe + Supabase",
    description:
      "Give every roommate clarity with automated autopay, instant receipt sharing, and a real-time ledger per unit.",
    points: [
      "Stripe Billing subscriptions mapped to each roommate split",
      "Supabase tables mirror balances, deposits, and late fees",
      "One-click exports for accountants and property managers",
    ],
    cta: { label: "Review rent operations", href: "/payments" },
  },
  {
    title: "Operations kit with Cal.com + Documenso",
    description:
      "Bookings, guests, and legal docs stay synchronized so roommates always know what&rsquo;s next.",
    points: [
      "Conflict-free amenity reservations with Cal.com embeds",
      "Documenso templates for leases, renewals, and addenda",
      "Automated alerts for expiring documents and visitor limits",
    ],
    cta: { label: "See scheduling & docs", href: "/documents" },
  },
]

export const workflowSteps = [
  {
    step: "1",
    title: "Invite roommates & assign units",
    description: "Sync your roster into Supabase and map rent shares in minutes.",
  },
  {
    step: "2",
    title: "Connect Stripe, Cal.com, Documenso",
    description: "Authorize each integration once to unlock autopay, bookings, and eSignatures.",
  },
  {
    step: "3",
    title: "Launch household rituals",
    description: "Turn on autopay, publish amenity schedules, and open the roommate feed.",
  },
  {
    step: "4",
    title: "Monitor & iterate together",
    description: "Use shared insights to adjust rent splits, policies, and maintenance priorities.",
  },
]
