"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import ModerationControls from "@/components/messaging/moderation-controls"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { Paperclip } from "lucide-react"

type ThreadListItem = {
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
  draft?: boolean
}

type Attachment = {
  id: string
  label: string
  description: string
  type: string
}

type PollOption = {
  label: string
  votes: number
}

type ThreadPoll = {
  question: string
  closesAt: string
  totalVotes: number
  options: PollOption[]
}

type PostReaction = {
  emoji: string
  count: number
  active?: boolean
}

type ThreadPost = {
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

type AttachmentSummary = {
  id: string
  title: string
  thread: string
  updatedBy: string
  type: string
}

type PollSnapshot = {
  id: string
  title: string
  thread: string
  closesAt: string
  leadingOption: string
  votes: number
  progress: number
}

const threadCategoryValues = [
  "Chores",
  "Logistics",
  "Maintenance",
  "Social",
  "House rules",
] as const

const pollDurationValues = ["24_hours", "48_hours", "end_of_week"] as const

const pollDurations = [
  { value: "24_hours", label: "24 hours" },
  { value: "48_hours", label: "48 hours" },
  { value: "end_of_week", label: "End of week" },
] as const

const threadFilters = [
  { label: "All topics", active: true },
  { label: "Chores", active: false },
  { label: "Logistics", active: false },
  { label: "Maintenance", active: false },
  { label: "House rules", active: false },
  { label: "Social", active: false },
]

const initialThreadList: ThreadListItem[] = [
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

const initialPollSnapshots: PollSnapshot[] = [
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

const newThreadSchema = z
  .object({
    title: z.string().min(4, "Thread title must be at least 4 characters"),
    category: z.enum(threadCategoryValues, {
      required_error: "Select a category for the thread",
    }),
    summary: z
      .string()
      .min(20, "Share a short summary so everyone understands the context"),
    kickoffMessage: z
      .string()
      .min(30, "Give roommates context and outline the next steps"),
    includePoll: z.boolean(),
    pollQuestion: z.string().optional(),
    pollOptionOne: z.string().optional(),
    pollOptionTwo: z.string().optional(),
    pollOptionThree: z.string().optional(),
    pollDeadline: z.enum(pollDurationValues).optional(),
    pinThread: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.includePoll) {
      return
    }

    if (!data.pollQuestion || data.pollQuestion.trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pollQuestion"],
        message: "Poll question must be at least 10 characters",
      })
    }

    if (!data.pollOptionOne || data.pollOptionOne.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pollOptionOne"],
        message: "Add a first poll option",
      })
    }

    if (!data.pollOptionTwo || data.pollOptionTwo.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pollOptionTwo"],
        message: "Add a second poll option",
      })
    }

    if (
      data.pollOptionThree &&
      data.pollOptionThree.trim().length > 0 &&
      data.pollOptionThree.trim().length < 2
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pollOptionThree"],
        message: "Poll option must be at least 2 characters",
      })
    }

    if (!data.pollDeadline) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pollDeadline"],
        message: "Select when the poll should close",
      })
    }
  })

type NewThreadFormValues = z.infer<typeof newThreadSchema>

const createNewThreadDefaults = (): NewThreadFormValues => ({
  title: "",
  category: threadCategoryValues[0],
  summary: "",
  kickoffMessage: "",
  includePoll: false,
  pollQuestion: "",
  pollOptionOne: "",
  pollOptionTwo: "",
  pollOptionThree: "",
  pollDeadline: "48_hours",
  pinThread: false,
})

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

type NewThreadDialogProps = {
  existingThreadIds: string[]
  onCreate: (payload: { thread: ThreadListItem; poll?: PollSnapshot }) => void
}

function NewThreadDialog({ existingThreadIds, onCreate }: NewThreadDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<NewThreadFormValues>({
    resolver: zodResolver(newThreadSchema),
    defaultValues: createNewThreadDefaults(),
    mode: "onSubmit",
  })

  const includePoll = form.watch("includePoll")
  const titleValue = form.watch("title")
  const categoryValue = form.watch("category")
  const summaryValue = form.watch("summary")
  const kickoffMessageValue = form.watch("kickoffMessage")
  const pollQuestionValue = form.watch("pollQuestion")
  const pollOptionOneValue = form.watch("pollOptionOne")
  const pollOptionTwoValue = form.watch("pollOptionTwo")
  const pollOptionThreeValue = form.watch("pollOptionThree")
  const pollDeadlineValue = form.watch("pollDeadline")
  const pinThreadValue = form.watch("pinThread")

  const resetForm = () => form.reset(createNewThreadDefaults())

  const pollOptionsPreview = [
    pollOptionOneValue,
    pollOptionTwoValue,
    pollOptionThreeValue,
  ].filter((option): option is string => Boolean(option && option.trim()))

  const closingPreviewLabel = pollDurations.find(
    (duration) => duration.value === pollDeadlineValue,
  )?.label

  const onSubmit = (values: NewThreadFormValues) => {
    const trimmedTitle = values.title.trim()
    const trimmedSummary = values.summary.trim()
    const baseId = slugify(trimmedTitle)
    const preferredId = baseId.length ? baseId : `thread-${Date.now()}`
    const uniqueId = existingThreadIds.includes(preferredId)
      ? `${preferredId}-${Date.now()}`
      : preferredId

    const closingLabel = pollDurations.find(
      (duration) => duration.value === values.pollDeadline,
    )?.label
    const closingCopy = closingLabel ? closingLabel.toLowerCase() : "soon"

    const newThread: ThreadListItem = {
      id: uniqueId,
      title: trimmedTitle,
      category: values.category,
      summary: trimmedSummary,
      lastMessageAt: "Drafted just now",
      unreadCount: 0,
      participants: 5,
      attachments: 0,
      activity: values.includePoll
        ? `Poll closes in ${closingCopy}`
        : "Draft ready to publish",
      reactions: values.includePoll ? ["📊"] : [],
      pinned: values.pinThread ? true : undefined,
      draft: true,
    }

    const pollOptions = [
      values.pollOptionOne,
      values.pollOptionTwo,
      values.pollOptionThree,
    ]
      .map((option) => option?.trim())
      .filter((option): option is string => Boolean(option && option.length > 0))

    const pollSnapshot: PollSnapshot | undefined = values.includePoll
      ? {
          id: uniqueId,
          title: values.pollQuestion?.trim() ?? "",
          thread: trimmedTitle,
          closesAt: `Closes in ${closingCopy}`,
          leadingOption: pollOptions[0] ?? "",
          votes: 0,
          progress: 0,
        }
      : undefined

    onCreate({ thread: newThread, poll: pollSnapshot })
    toast({
      title: "Thread draft saved",
      description: values.includePoll
        ? "Your poll will launch once the thread is published to roommates."
        : "Publish the thread when you're ready to notify roommates.",
    })

    setOpen(false)
    resetForm()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          resetForm()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">New thread</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Start a new thread</DialogTitle>
          <DialogDescription>
            Draft a focused update, attach context, and optionally launch a poll to gather roommate feedback.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thread title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Meal prep rotation for July"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Titles appear in the thread list and activity digest.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {threadCategoryValues.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Organize the conversation alongside similar topics.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share the TL;DR so everyone knows what decisions you need."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This short summary appears under the thread title and in daily recaps.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kickoffMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kickoff message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide background, what you need from roommates, and any deadlines."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This becomes the first post in the thread when you publish.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="pinThread"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-dashed border-border/60 p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Pin thread on publish</FormLabel>
                      <FormDescription>
                        Keep this conversation above others until you unpin it.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="includePoll"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-dashed border-border/60 p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Launch a poll</FormLabel>
                      <FormDescription>
                        Collect votes directly in the thread to speed up decisions.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {includePoll ? (
              <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-semibold text-primary">
                  Poll details
                </p>
                <FormField
                  control={form.control}
                  name="pollQuestion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poll question</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Which deep clean weekend works best for everyone?"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="pollOptionOne"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Option one</FormLabel>
                        <FormControl>
                          <Input placeholder="First choice" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pollOptionTwo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Option two</FormLabel>
                        <FormControl>
                          <Input placeholder="Second choice" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pollOptionThree"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Option three</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional third choice" {...field} />
                        </FormControl>
                        <FormDescription>
                          Leave blank if you only need two options.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pollDeadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poll closes in</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose when to close" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {pollDurations.map((duration) => (
                              <SelectItem key={duration.value} value={duration.value}>
                                {duration.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-3 rounded-lg border border-dashed border-border/60 bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Thread preview
              </p>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {titleValue || "Thread title"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(categoryValue && categoryValue.length > 0
                    ? categoryValue
                    : "Category TBD") +
                    " • " +
                    (pinThreadValue ? "Pinned on publish" : "Draft")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {summaryValue || "Summaries help roommates understand why this thread matters."}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Kickoff message
                </p>
                <p className="text-sm text-muted-foreground">
                  {kickoffMessageValue ||
                    "Use the kickoff message to outline context, desired actions, and timing."}
                </p>
              </div>
              {includePoll ? (
                <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Poll draft
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {pollQuestionValue || "Poll question will appear here"}
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {pollOptionsPreview.length > 0 ? (
                      pollOptionsPreview.map((option) => (
                        <li key={option}>• {option}</li>
                      ))
                    ) : (
                      <li>Populate options to preview the choices roommates will see.</li>
                    )}
                  </ul>
                  {closingPreviewLabel ? (
                    <p className="text-xs text-muted-foreground">
                      Closes in {closingPreviewLabel.toLowerCase()}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save draft</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default function MessagingPage() {
  const [threads, setThreads] = useState<ThreadListItem[]>(initialThreadList)
  const [polls, setPolls] = useState<PollSnapshot[]>(initialPollSnapshots)

  const handleCreateThread = ({
    thread,
    poll,
  }: {
    thread: ThreadListItem
    poll?: PollSnapshot
  }) => {
    setThreads((previous) => [thread, ...previous])
    if (poll) {
      setPolls((previous) => [poll, ...previous])
    }
  }

  return (
    <div className="container max-w-6xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Messaging</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Organize roommate discussions by topic, capture reactions, and close the loop on decisions with polls and shared attachments.
          </p>
        </div>
        <Separator />
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr] xl:grid-cols-[320px,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle>Threaded conversations</CardTitle>
                  <CardDescription>
                    Keep every roommate topic in its own thread so updates, reactions, and attachments stay in context.
                  </CardDescription>
                </div>
                <NewThreadDialog
                  existingThreadIds={threads.map((thread) => thread.id)}
                  onCreate={handleCreateThread}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {threadFilters.map((filter) => (
                  <span
                    key={filter.label}
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                      filter.active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/70 text-muted-foreground"
                    )}
                  >
                    {filter.label}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className={cn(
                    "space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4 transition hover:border-primary/50 hover:bg-background",
                    thread.draft && "border-primary/60 bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{thread.category}</Badge>
                        {thread.pinned ? (
                          <Badge variant="outline" className="uppercase">
                            Pinned
                          </Badge>
                        ) : null}
                        {thread.draft ? (
                          <Badge
                            variant="outline"
                            className="border-primary/40 text-primary"
                          >
                            Draft
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold text-foreground">{thread.title}</p>
                      <p className="text-xs text-muted-foreground">{thread.summary}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs">
                      <span className="text-muted-foreground">{thread.lastMessageAt}</span>
                      {thread.unreadCount > 0 ? (
                        <span className="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">
                          {thread.unreadCount} new
                        </span>
                      ) : null}
                      <div className="flex gap-1">
                        {thread.reactions.map((reaction) => (
                          <span
                            key={`${thread.id}-${reaction}`}
                            className="inline-flex size-6 items-center justify-center rounded-full bg-background text-sm"
                            aria-hidden
                          >
                            {reaction}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>{thread.participants} participants</span>
                    <span>{thread.attachments} attachments</span>
                    <span>{thread.activity}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Polls & alignment</CardTitle>
              <CardDescription>
                Track decisions across threads so chores, logistics, and maintenance stay in sync.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {polls.map((poll) => (
                  <div
                    key={poll.id}
                    className="space-y-3 rounded-lg border border-border/60 bg-background/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{poll.title}</p>
                        <p className="text-xs text-muted-foreground">{poll.thread}</p>
                      </div>
                      <Badge variant="secondary">{poll.closesAt}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span>{poll.leadingOption}</span>
                        <span>{poll.votes} votes</span>
                      </div>
                      <Progress value={poll.progress} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>{activeThread.title}</CardTitle>
                  <CardDescription>{activeThread.summary}</CardDescription>
                </div>
                <Badge variant="secondary">{activeThread.category}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>Owner: {activeThread.owner}</span>
                <span>{activeThread.participants} roommates involved</span>
                <span>Updated {activeThread.updated}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {threadPosts.map((post, index) => (
                <div key={post.id} className="space-y-4">
                  <article className="space-y-4 rounded-lg border border-border/60 bg-background/90 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback className={cn("text-sm font-medium", post.author.accent)}>
                          {post.author.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{post.author.name}</span>
                          <Badge variant="outline">{post.author.role}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{post.timestamp}</span>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm leading-6 text-foreground">
                      {post.content.map((paragraph, idx) => (
                        <p key={`${post.id}-content-${idx}`} className="text-muted-foreground">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {post.attachments?.length ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Attachments
                        </p>
                        <div className="space-y-2">
                          {post.attachments.map((attachment) => (
                            <div
                              key={`${post.id}-${attachment.id}`}
                              className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/40 px-3 py-2"
                            >
                              <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                              <div className="flex flex-1 flex-col">
                                <span className="text-sm font-medium text-foreground">{attachment.label}</span>
                                <span className="text-xs text-muted-foreground">{attachment.description}</span>
                              </div>
                              <Badge variant="outline" className="whitespace-nowrap">
                                {attachment.type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {post.poll ? (
                      <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{post.poll.question}</p>
                            <p className="text-xs text-muted-foreground">Vote once to lock in the weekend.</p>
                          </div>
                          <Badge variant="secondary">Closes {post.poll.closesAt}</Badge>
                        </div>
                        <div className="space-y-3">
                          {post.poll.options.map((option) => {
                            const percent =
                              post.poll && post.poll.totalVotes > 0
                                ? Math.round((option.votes / post.poll.totalVotes) * 100)
                                : 0

                            return (
                              <div key={`${post.id}-${option.label}`} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                  <span>{option.label}</span>
                                  <span>
                                    {option.votes} vote{option.votes === 1 ? "" : "s"} · {percent}%
                                  </span>
                                </div>
                                <Progress value={percent} />
                              </div>
                            )
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {post.poll.totalVotes} roommate votes collected so far
                        </p>
                      </div>
                    ) : null}

                    {post.reactions?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {post.reactions.map((reaction) => (
                          <Button
                            key={`${post.id}-${reaction.emoji}`}
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-8 rounded-full border-dashed bg-background/60 px-3 text-xs",
                              reaction.active && "border-primary text-primary"
                            )}
                          >
                            <span className="mr-1 text-base" aria-hidden>
                              {reaction.emoji}
                            </span>
                            {reaction.count}
                          </Button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-full px-3 text-xs text-muted-foreground"
                        >
                          + Add reaction
                        </Button>
                      </div>
                    ) : null}
                  </article>
                  {index < threadPosts.length - 1 ? <Separator /> : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shared attachments</CardTitle>
              <CardDescription>
                Surface the latest files pinned across threads so everyone can reference the source of truth.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {attachmentSummary.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"
                >
                  <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">{attachment.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.thread} • {attachment.updatedBy}
                    </p>
                  </div>
                  <Badge variant="outline" className="whitespace-nowrap">
                    {attachment.type}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <ModerationControls />
    </div>
  )
}
