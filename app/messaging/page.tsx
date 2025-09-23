import type { SearchEntity } from "@/lib/search/client"
import { ingestTopEntities } from "@/lib/search/client"
import {
  MessagingPageClient,
  type AttachmentSummary,
  type MessagingThread,
  type PollSnapshot,
  type ThreadListItem,
  type ThreadPost,
} from "./components/messaging-page-client"

const threadFilters: Array<{ label: string; value: string | null }> = [
  { label: "All topics", value: null },
  { label: "Chores", value: "Chores" },
  { label: "Logistics", value: "Logistics" },
  { label: "Maintenance", value: "Maintenance" },
  { label: "Social", value: "Social" },
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

const activeThread: MessagingThread = {
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

const buildMessagingSearchEntities = (): SearchEntity[] => {
  const threadEntities: SearchEntity[] = threadList.map((thread) => ({
    id: thread.id,
    scope: "messaging",
    title: thread.title,
    description: thread.summary,
    content: `${thread.summary} ${thread.activity}`,
    type: "thread",
    priority: thread.pinned ? 50 : 10,
    keywords: [thread.category, ...thread.reactions],
    synonyms: thread.reactions,
    facets: {
      category: thread.category,
      pinned: thread.pinned ? "true" : "false",
    },
  }))

  const postEntities: SearchEntity[] = threadPosts.map((post) => ({
    id: `post-${post.id}`,
    scope: "messaging",
    title: `${post.author.name} update`,
    description: post.content.join(" "),
    content: [
      post.content.join(" "),
      post.poll?.question ?? "",
      post.attachments?.map((attachment) => attachment.label).join(" ") ?? "",
    ].join(" "),
    type: "message",
    priority:
      post.reactions?.reduce((acc, reaction) => acc + reaction.count, 0) ??
      (post.poll?.totalVotes ?? 0),
    keywords: [post.author.name, post.author.role],
    synonyms: post.reactions?.map((reaction) => reaction.emoji) ?? [],
    facets: {
      author: post.author.name,
      category: activeThread.category,
    },
  }))

  const attachmentEntities: SearchEntity[] = attachmentSummary.map((attachment) => ({
    id: `attachment-${attachment.id}`,
    scope: "messaging",
    title: attachment.title,
    description: `${attachment.thread} • ${attachment.updatedBy}`,
    content: `${attachment.title} ${attachment.thread} ${attachment.updatedBy}`,
    type: "attachment",
    priority: 5,
    keywords: [attachment.thread, attachment.type],
    synonyms: [],
    facets: {
      thread: attachment.thread,
      type: attachment.type,
    },
  }))

  const pollEntities: SearchEntity[] = pollSnapshots.map((poll) => ({
    id: `poll-${poll.id}`,
    scope: "messaging",
    title: poll.title,
    description: poll.thread,
    content: `${poll.thread} ${poll.leadingOption} ${poll.closesAt}`,
    type: "poll",
    priority: poll.votes,
    keywords: [poll.thread, poll.leadingOption],
    synonyms: [],
    facets: {
      thread: poll.thread,
    },
  }))

  return [...threadEntities, ...postEntities, ...attachmentEntities, ...pollEntities]
}

export default async function MessagingPage() {
  const searchEntities = buildMessagingSearchEntities()
  await ingestTopEntities(searchEntities, { limit: 200 })

  return (
    <MessagingPageClient
      threadFilters={threadFilters}
      threadList={threadList}
      threadPosts={threadPosts}
      attachmentSummary={attachmentSummary}
      pollSnapshots={pollSnapshots}
      activeThread={activeThread}
    />
  )
}
