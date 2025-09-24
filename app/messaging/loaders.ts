"use server"

import "server-only"

export type ThreadListItem = {
  id: string
  title: string
  category: string
  summary: string
  lastMessageAt: string
  unreadCount: number
  participants: number
  attachments: number
  activity: string
  reactions: string[]
  pinned?: boolean
}

export type Attachment = {
  id: string
  label: string
  description: string
  type: string
}

export type PollOption = {
  label: string
  votes: number
}

export type ThreadPoll = {
  question: string
  closesAt: string
  totalVotes: number
  options: PollOption[]
}

export type PostReaction = {
  emoji: string
  count: number
  active?: boolean
}

export type ThreadPost = {
  id: string
  author: {
    name: string
    role: string
    initials: string
    accent: string
  }
  timestamp: string
  content: string[]
  attachments?: Attachment[]
  poll?: ThreadPoll
  reactions?: PostReaction[]
}

export type AttachmentSummary = {
  id: string
  title: string
  thread: string
  updatedBy: string
  type: string
}

export type PollSnapshot = {
  id: string
  title: string
  thread: string
  closesAt: string
  leadingOption: string
  votes: number
  progress: number
}

export type ThreadFilter = {
  label: string
  active: boolean
}

export type QuickTemplateIcon = "announcement" | "poll" | "maintenance" | "event"

export type QuickTemplate = {
  id: string
  title: string
  description: string
  icon: QuickTemplateIcon
  badges: string[]
}

export type BoardAutomation = {
  id: string
  label: string
  description: string
  enabled: boolean
  channels: string[]
  metric: string
}

export type PresenceMember = {
  id: string
  name: string
  role: string
  initials: string
  accent: string
  status: string
  statusAccent: string
  focus: string
  lastActive: string
}

export type DigestSchedule = {
  id: string
  title: string
  cadence: string
  recipients: string
  nextSend: string
  channels: string[]
  summary: string
}

export type LinkedWorkflowSeverity = "High" | "Medium" | "Low"

export type LinkedWorkflow = {
  id: string
  type: string
  title: string
  status: string
  owner: string
  due: string
  thread: string
  summary: string
  severity: LinkedWorkflowSeverity
}

export type BoardMetricTrend = "up" | "down" | "steady"

export type BoardMetric = {
  id: string
  label: string
  value: string
  trend: BoardMetricTrend
  trendLabel: string
  description: string
}

export type BoardActivityType = "thread" | "poll" | "maintenance" | "booking" | "visitor" | "document"

export type BoardActivity = {
  id: string
  type: BoardActivityType
  timestamp: string
  title: string
  description: string
  actor: string
  thread: string
  meta: string
}

const threadFilters: ThreadFilter[] = [
  { label: "All topics", active: true },
  { label: "Chores", active: false },
  { label: "Logistics", active: false },
  { label: "Maintenance", active: false },
  { label: "Social", active: false },
]

const threadList: ThreadListItem[] = [
  {
    id: "chore-rotation",
    title: "Q2 chore rotation plan",
    category: "Chores",
    summary:
      "Maya shared the deep clean poll and refreshed the rotation checklist for April through June.",
    lastMessageAt: "8 minutes ago",
    unreadCount: 3,
    participants: 5,
    attachments: 3,
    activity: "Poll closes Friday",
    reactions: ["🧽", "📊"],
    pinned: true,
  },
  {
    id: "wifi-upgrade",
    title: "Wi-Fi upgrade appointment",
    category: "Maintenance",
    summary: "Installer confirmed for Tuesday 3 PM — need a roommate at home for access.",
    lastMessageAt: "1 hour ago",
    unreadCount: 0,
    participants: 4,
    attachments: 1,
    activity: "Awaiting volunteer",
    reactions: ["📡"],
  },
  {
    id: "grocery-coop",
    title: "June grocery co-op",
    category: "Logistics",
    summary: "Poll launched for bulk Costco run and shared pantry restock wishlist.",
    lastMessageAt: "3 hours ago",
    unreadCount: 1,
    participants: 6,
    attachments: 2,
    activity: "Poll 65% complete",
    reactions: ["🛒", "👍"],
  },
  {
    id: "guest-policy",
    title: "Guest visit guidelines",
    category: "House rules",
    summary: "Property manager posted updated visitor limits and overnight request process.",
    lastMessageAt: "Yesterday",
    unreadCount: 0,
    participants: 5,
    attachments: 2,
    activity: "Decision logged",
    reactions: ["✅"],
  },
]

const activeThread = {
  title: "Q2 chore rotation plan",
  summary:
    "Keep the shared areas sparkling with a rotation everyone can reference — vote on the deep clean weekend and review updated checklists in one place.",
  category: "Chores",
  owner: "Maya Patel",
  participants: 5,
  updated: "8 minutes ago",
}

const threadPosts: ThreadPost[] = [
  {
    id: "maya-intro",
    author: {
      name: "Maya Patel",
      role: "Host roommate",
      initials: "MP",
      accent: "bg-sky-500/20 text-sky-700",
    },
    timestamp: "Today • 8:45 AM",
    content: [
      "Kicking off the Q2 chore rotation thread so we can stay ahead of the spring deep clean.",
      "Please vote in the poll for when we should tackle the deep clean together. I added the updated checklist and rotation calendar so everyone can review before voting.",
    ],
    attachments: [
      {
        id: "checklist",
        label: "Deep clean checklist.pdf",
        description: "Property manager template · 320 KB",
        type: "Document",
      },
      {
        id: "calendar",
        label: "Q2 rotation.xlsx",
        description: "Draft assignments by week · 120 KB",
        type: "Spreadsheet",
      },
    ],
    poll: {
      question: "When should we schedule the deep clean weekend?",
      closesAt: "Friday 6:00 PM",
      totalVotes: 9,
      options: [
        { label: "Saturday 10:00 AM", votes: 4 },
        { label: "Saturday 2:00 PM", votes: 3 },
        { label: "Sunday 11:00 AM", votes: 2 },
      ],
    },
    reactions: [
      { emoji: "👍", count: 4, active: true },
      { emoji: "🧽", count: 3 },
      { emoji: "✨", count: 2 },
    ],
  },
  {
    id: "jordan-feedback",
    author: {
      name: "Jordan Lee",
      role: "Roommate",
      initials: "JL",
      accent: "bg-amber-500/20 text-amber-700",
    },
    timestamp: "Today • 9:05 AM",
    content: [
      "Looks good to me. I left a couple of notes in the sheet about trading weekends because of my travel schedule.",
      "If we go with the Saturday 10 AM block, I can take recycling duty during the week so Sunday stays open.",
    ],
    attachments: [
      {
        id: "notes",
        label: "Rotation comments.xlsx",
        description: "Suggested swaps highlighted in yellow",
        type: "Spreadsheet",
      },
    ],
    reactions: [
      { emoji: "✅", count: 3 },
      { emoji: "🙌", count: 1 },
    ],
  },
  {
    id: "avery-wrap-up",
    author: {
      name: "Avery Chen",
      role: "Property manager",
      initials: "AC",
      accent: "bg-purple-500/20 text-purple-700",
    },
    timestamp: "Today • 9:42 AM",
    content: [
      "Thanks everyone! Once the poll closes I'll lock the rotation and post a PDF to the documents hub.",
      "Reminder that the spring inspection is on April 18 — make sure kitchen counters and the entryway are cleared the night before.",
    ],
    reactions: [
      { emoji: "📌", count: 2 },
      { emoji: "👏", count: 2 },
    ],
  },
]

const attachmentSummary: AttachmentSummary[] = [
  {
    id: "rotation",
    title: "Q2 rotation.xlsx",
    thread: "Q2 chore rotation plan",
    updatedBy: "Maya • 8:45 AM",
    type: "Spreadsheet",
  },
  {
    id: "inspection",
    title: "Spring inspection guide.pdf",
    thread: "Guest visit guidelines",
    updatedBy: "Avery • Yesterday",
    type: "Document",
  },
  {
    id: "grocery-list",
    title: "Bulk grocery wishlist.csv",
    thread: "June grocery co-op",
    updatedBy: "Jordan • Monday",
    type: "Spreadsheet",
  },
]

const pollSnapshots: PollSnapshot[] = [
  {
    id: "deep-clean",
    title: "Deep clean weekend",
    thread: "Q2 chore rotation plan",
    closesAt: "Closes Friday",
    leadingOption: "Saturday 10:00 AM",
    votes: 9,
    progress: 68,
  },
  {
    id: "grocery-run",
    title: "Costco run timing",
    thread: "June grocery co-op",
    closesAt: "Closes in 2 days",
    leadingOption: "Sunday afternoon",
    votes: 12,
    progress: 54,
  },
  {
    id: "wifi-coverage",
    title: "Who can host installer?",
    thread: "Wi-Fi upgrade appointment",
    closesAt: "Closes tonight",
    leadingOption: "Jordan",
    votes: 4,
    progress: 75,
  },
]

const quickTemplates: QuickTemplate[] = [
  {
    id: "house-announcement",
    title: "House announcement",
    description: "Pin a policy change or inspection notice with attachments and acknowledgements.",
    icon: "announcement",
    badges: ["Pinned", "Attachments", "Read receipts"],
  },
  {
    id: "decision-poll",
    title: "Decision poll",
    description: "Launch a poll with deadline reminders and auto-close when quorum is met.",
    icon: "poll",
    badges: ["Poll", "Reminder", "Auto-summary"],
  },
  {
    id: "maintenance-update",
    title: "Maintenance update",
    description: "Sync maintenance requests so everyone sees progress and scheduled visits.",
    icon: "maintenance",
    badges: ["Work order", "Scheduler", "Manager copy"],
  },
  {
    id: "event-planning",
    title: "Event planning",
    description: "Co-ordinate shared meals, celebrations, or supply runs with RSVP tracking.",
    icon: "event",
    badges: ["RSVP", "Shared list", "Calendar"],
  },
]

const boardAutomations: BoardAutomation[] = [
  {
    id: "morning-digest",
    label: "Morning digest",
    description: "Send an 8:00 AM recap of new threads, polls, and upcoming bookings.",
    enabled: true,
    channels: ["Email", "Push"],
    metric: "82% open rate last week",
  },
  {
    id: "quiet-hours-alerts",
    label: "Quiet hours alerts",
    description: "Auto-notify the property team when quiet-hour policies are violated twice in 24 hours.",
    enabled: true,
    channels: ["SMS", "Manager inbox"],
    metric: "3 escalations resolved this month",
  },
  {
    id: "slack-bridge",
    label: "Slack bridge",
    description: "Mirror pinned announcements into the onsite staff Slack channel for visibility.",
    enabled: false,
    channels: ["Slack", "Webhook"],
    metric: "Pending activation",
  },
]

const presenceMembers: PresenceMember[] = [
  {
    id: "maya",
    name: "Maya Patel",
    role: "Host roommate",
    initials: "MP",
    accent: "bg-sky-500/20 text-sky-700",
    status: "Online",
    statusAccent: "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30",
    focus: "Coordinating deep clean poll",
    lastActive: "Responded 5m ago",
  },
  {
    id: "jordan",
    name: "Jordan Lee",
    role: "Roommate",
    initials: "JL",
    accent: "bg-amber-500/20 text-amber-700",
    status: "Away",
    statusAccent: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30",
    focus: "Traveling • auto-replies enabled",
    lastActive: "Reads digest 2x per day",
  },
  {
    id: "avery",
    name: "Avery Chen",
    role: "Property manager",
    initials: "AC",
    accent: "bg-purple-500/20 text-purple-700",
    status: "Online",
    statusAccent: "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30",
    focus: "Reviewing maintenance follow-ups",
    lastActive: "Moderated 12m ago",
  },
  {
    id: "diego",
    name: "Diego Ramos",
    role: "Roommate",
    initials: "DR",
    accent: "bg-rose-500/20 text-rose-700",
    status: "Offline",
    statusAccent: "bg-slate-500/15 text-slate-600 ring-1 ring-slate-400/30",
    focus: "Quiet hours auto-watching",
    lastActive: "Last seen yesterday",
  },
]

const digestSchedule: DigestSchedule[] = [
  {
    id: "daily-roommates",
    title: "Roommate recap",
    cadence: "Daily • 8:00 AM",
    recipients: "All roommates",
    nextSend: "In 2 hours",
    channels: ["Email", "Mobile push"],
    summary: "Threads with new replies, polls closing today, overnight visitor approvals.",
  },
  {
    id: "manager-weekly",
    title: "Manager weekly brief",
    cadence: "Weekly • Mondays",
    recipients: "Property manager + onsite team",
    nextSend: "June 24",
    channels: ["Email", "Slack"],
    summary: "Maintenance SLA status, policy flags, and amenity bookings for the week ahead.",
  },
]

const linkedWorkflows: LinkedWorkflow[] = [
  {
    id: "maintenance-482",
    type: "Maintenance request",
    title: "Dishwasher leak follow-up",
    status: "Awaiting parts",
    owner: "Avery Chen",
    due: "Technician on-site Thursday",
    thread: "Wi-Fi upgrade appointment",
    summary: "Work order MR-482 synced from maintenance hub with next visit blocked on parts delivery.",
    severity: "High",
  },
  {
    id: "amenity-209",
    type: "Amenity booking",
    title: "Kitchen deep clean hold",
    status: "Confirmed",
    owner: "Maya Patel",
    due: "Blocked Saturday 9-11 AM",
    thread: "Q2 chore rotation plan",
    summary: "Cal.com reservation mirrors the winning poll option so roommates don't double-book.",
    severity: "Medium",
  },
  {
    id: "visitor-118",
    type: "Visitor log",
    title: "Jordan guest request",
    status: "Approved",
    owner: "Property team",
    due: "Stay June 20-22",
    thread: "Guest visit guidelines",
    summary: "Visitor record VL-118 auto-linked after approval so roommates see who is staying overnight.",
    severity: "Low",
  },
]

const boardMetrics: BoardMetric[] = [
  {
    id: "response-time",
    label: "Median response time",
    value: "12m",
    trend: "up",
    trendLabel: "Improved 18% vs last week",
    description: "Roommates reply quickly when tagged in chore or maintenance threads.",
  },
  {
    id: "coverage",
    label: "Threads with decisions",
    value: "86%",
    trend: "steady",
    trendLabel: "No change week-over-week",
    description: "Most conversations reach an outcome within three days.",
  },
  {
    id: "polls",
    label: "Poll participation",
    value: "94%",
    trend: "up",
    trendLabel: "+6% this month",
    description: "Quorum reached on all active polls before close date.",
  },
  {
    id: "flags",
    label: "Moderation flags",
    value: "2",
    trend: "down",
    trendLabel: "-3 vs last month",
    description: "Only two threads currently need property manager review.",
  },
]

const boardActivity: BoardActivity[] = [
  {
    id: "activity-1",
    type: "poll",
    timestamp: "9:40 AM",
    title: "Deep clean poll nearing quorum",
    description: "3 roommates still need to vote before Friday deadline.",
    actor: "Automations",
    thread: "Q2 chore rotation plan",
    meta: "Reminder scheduled",
  },
  {
    id: "activity-2",
    type: "maintenance",
    timestamp: "9:12 AM",
    title: "Maintenance ETA updated",
    description: "Technician rescheduled to Thursday 3 PM; notifications sent to tagged roommates.",
    actor: "Avery Chen",
    thread: "Dishwasher leak follow-up",
    meta: "Status: Awaiting parts",
  },
  {
    id: "activity-3",
    type: "booking",
    timestamp: "8:55 AM",
    title: "Amenity booking synced",
    description: "Cal.com slot for kitchen deep clean added to shared calendar.",
    actor: "Cal.com webhook",
    thread: "Kitchen deep clean hold",
    meta: "No conflicts detected",
  },
  {
    id: "activity-4",
    type: "visitor",
    timestamp: "8:10 AM",
    title: "Guest arrival confirmed",
    description: "Jordan's guest approved for June 20-22 with overnight policy reminder sent.",
    actor: "Visitor log",
    thread: "Jordan guest request",
    meta: "Auto-shared with roommates",
  },
  {
    id: "activity-5",
    type: "document",
    timestamp: "Yesterday",
    title: "Lease addendum uploaded",
    description: "Documenso version history updated with signed quiet hours addendum.",
    actor: "Documenso",
    thread: "Quiet hours disruption",
    meta: "Receipt stored in documents hub",
  },
]

export async function loadMessagingThreadData() {
  return {
    threadFilters,
    threadList,
    activeThread,
    threadPosts,
    attachmentSummary,
    pollSnapshots,
    quickTemplates,
    boardAutomations,
    presenceMembers,
    digestSchedule,
    linkedWorkflows,
    boardMetrics,
    boardActivity,
  }
}
