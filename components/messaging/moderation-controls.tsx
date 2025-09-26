"use client"

import * as React from "react"
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  Flag as FlagIcon,
  Inbox,
  ShieldCheck,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type ModerationThread = {
  id: string
  subject: string
  unit: string
  severity: "High" | "Medium" | "Low"
  status: "Needs review" | "Monitoring" | "Escalated"
  flags: number
  lastActivity: string
  flaggedBy: string
  flaggedReason: string
  nextStep: string
  watchers: string[]
  messages: {
    id: string
    sender: string
    sentAt: string
    content: string
    isFlagged?: boolean
  }[]
  workflow: {
    id: string
    timestamp: string
    description: string
  }[]
}

const moderationThreads: ModerationThread[] = [
  {
    id: "quiet-hours",
    subject: "Quiet hours disruption",
    unit: "Unit 3B",
    severity: "High",
    status: "Needs review",
    flags: 3,
    lastActivity: "2 hours ago",
    flaggedBy: "Aisha • Roommate",
    flaggedReason: "Three roommates reported repeated noise after 11pm quiet hours.",
    nextStep: "Escalate to onsite staff if the thread is still active after today's follow-up.",
    watchers: ["Night concierge", "Property care team"],
    messages: [
      {
        id: "msg-quiet-1",
        sender: "Aisha",
        sentAt: "8:12 PM",
        content: "Could we please keep the TV volume down after quiet hours? It's been waking me up all week.",
        isFlagged: true,
      },
      {
        id: "msg-quiet-2",
        sender: "Jordan",
        sentAt: "8:18 PM",
        content: "Just seeing this now. I'll turn it down and make sure guests know the policy.",
      },
      {
        id: "msg-quiet-3",
        sender: "Automated moderation",
        sentAt: "8:19 PM",
        content: "Thread flagged for review: three quiet-hour violations detected this month.",
        isFlagged: true,
      },
    ],
    workflow: [
      {
        id: "quiet-wf-1",
        timestamp: "8:19 PM",
        description: "Policy engine flagged the thread for repeated quiet-hour violations.",
      },
      {
        id: "quiet-wf-2",
        timestamp: "8:21 PM",
        description: "Auto-reply reminded roommates of the quiet hours clause in the lease.",
      },
      {
        id: "quiet-wf-3",
        timestamp: "8:30 PM",
        description: "Awaiting property manager decision: escalate or archive once resolved.",
      },
    ],
  },
  {
    id: "shared-fridge",
    subject: "Shared fridge etiquette",
    unit: "Unit 2A",
    severity: "Medium",
    status: "Monitoring",
    flags: 1,
    lastActivity: "45 minutes ago",
    flaggedBy: "Diego • Roommate",
    flaggedReason: "Language in the thread is getting tense around shared grocery space.",
    nextStep: "Keep thread open but archive automatically if no new reports come in within 24 hours.",
    watchers: ["You", "Community standards"],
    messages: [
      {
        id: "msg-fridge-1",
        sender: "Diego",
        sentAt: "6:47 PM",
        content: "Friendly reminder to label leftovers—I'm finding a lot of unmarked containers again.",
      },
      {
        id: "msg-fridge-2",
        sender: "Sam",
        sentAt: "6:52 PM",
        content: "Wasn't trying to be rude earlier. I'll clean the shelf tonight so we're reset.",
      },
      {
        id: "msg-fridge-3",
        sender: "Moderation bot",
        sentAt: "6:58 PM",
        content: "Thread flagged after two residents reported escalated language.",
        isFlagged: true,
      },
    ],
    workflow: [
      {
        id: "fridge-wf-1",
        timestamp: "6:58 PM",
        description: "Auto-moderation placed the thread in monitoring due to tone escalation.",
      },
      {
        id: "fridge-wf-2",
        timestamp: "7:01 PM",
        description: "Digest emailed a reminder of shared space etiquette to all roommates in Unit 2A.",
      },
      {
        id: "fridge-wf-3",
        timestamp: "7:15 PM",
        description: "No new reports detected. Archive will trigger automatically after 24 hours of calm.",
      },
    ],
  },
  {
    id: "pet-policy",
    subject: "Service animal clarification",
    unit: "Unit 4C",
    severity: "Low",
    status: "Escalated",
    flags: 2,
    lastActivity: "10 minutes ago",
    flaggedBy: "Maya • Property manager",
    flaggedReason: "Thread escalated to compliance to review documentation for a new service animal.",
    nextStep: "Waiting on compliance confirmation. Archive once paperwork is approved.",
    watchers: ["Compliance desk", "Pet policy reviewers"],
    messages: [
      {
        id: "msg-pet-1",
        sender: "Chris",
        sentAt: "7:55 PM",
        content: "I just submitted paperwork for my support dog. Let me know if you need anything else.",
      },
      {
        id: "msg-pet-2",
        sender: "Maya (Manager)",
        sentAt: "8:02 PM",
        content: "Thanks, Chris! I'm escalating this to compliance to double-check everything.",
        isFlagged: true,
      },
      {
        id: "msg-pet-3",
        sender: "Compliance desk",
        sentAt: "8:10 PM",
        content: "Paperwork received. We'll respond within one business day.",
      },
    ],
    workflow: [
      {
        id: "pet-wf-1",
        timestamp: "8:02 PM",
        description: "Property manager escalated the thread for documentation review.",
      },
      {
        id: "pet-wf-2",
        timestamp: "8:10 PM",
        description: "Compliance acknowledged receipt and assigned a reviewer.",
      },
      {
        id: "pet-wf-3",
        timestamp: "Pending",
        description: "Manager will archive the thread once compliance marks the request complete.",
      },
    ],
  },
]

const severityBadgeVariant: Record<ModerationThread["severity"], React.ComponentProps<typeof Badge>["variant"]> = {
  High: "destructive",
  Medium: "secondary",
  Low: "outline",
}

const statusStyles: Record<ModerationThread["status"], string> = {
  "Needs review": "bg-orange-100 text-orange-900 ring-1 ring-orange-400/40",
  Monitoring: "bg-sky-100 text-sky-900 ring-1 ring-sky-400/40",
  Escalated: "bg-purple-100 text-purple-900 ring-1 ring-purple-400/40",
}

export function ModerationControls() {
  const [selectedThread, setSelectedThread] = React.useState<ModerationThread>(moderationThreads[0])

  const onSelectThread = (thread: ModerationThread) => {
    setSelectedThread(thread)
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    thread: ModerationThread
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelectThread(thread)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Moderation controls</h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Flag, archive, or escalate threads without leaving the messaging workspace. Property managers get
            real-time context on why a discussion was flagged and the next best action to maintain a respectful
            community.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="flex items-center gap-1" variant="outline">
            <Inbox className="size-4" />
            Live queue
          </Badge>
          <Badge className="flex items-center gap-1" variant="outline">
            <ShieldCheck className="size-4" />
            RLS enforced
          </Badge>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
        <Card className="overflow-hidden border shadow-sm">
          <CardHeader className="flex flex-col gap-2 border-b bg-muted/40 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Active moderation queue</CardTitle>
              <CardDescription>Every flagged thread with context, severity, and quick triage actions.</CardDescription>
            </div>
            <Badge className="whitespace-nowrap" variant="outline">
              {moderationThreads.length} open items
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Thread</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Severity</th>
                    <th className="px-4 py-3 font-medium">Flags</th>
                    <th className="px-4 py-3 font-medium">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {moderationThreads.map((thread) => (
                    <tr
                      key={thread.id}
                      tabIndex={0}
                      aria-selected={selectedThread.id === thread.id}
                      onClick={() => onSelectThread(thread)}
                      onKeyDown={(event) => handleKeyDown(event, thread)}
                      className={cn(
                        "cursor-pointer bg-background transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                        selectedThread.id === thread.id && "bg-muted/60"
                      )}
                    >
                      <td className="p-4 align-top">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{thread.subject}</p>
                          <p className="text-xs text-muted-foreground">{thread.unit} · Flagged by {thread.flaggedBy}</p>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                            statusStyles[thread.status]
                          )}
                        >
                          {thread.status}
                        </span>
                      </td>
                      <td className="p-4 align-top">
                        <Badge variant={severityBadgeVariant[thread.severity]}>{thread.severity}</Badge>
                      </td>
                      <td className="p-4 align-top text-sm font-semibold text-foreground">{thread.flags}</td>
                      <td className="p-4 align-top text-xs text-muted-foreground">{thread.lastActivity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">{selectedThread.subject}</CardTitle>
            <CardDescription>
              {selectedThread.flaggedReason} Last touchpoint {selectedThread.lastActivity.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={severityBadgeVariant[selectedThread.severity]}>
                {selectedThread.severity} severity
              </Badge>
              <Badge variant="outline">{selectedThread.flags} flags logged</Badge>
              <Badge variant="outline">Status: {selectedThread.status}</Badge>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Conversation activity</p>
              <ScrollArea className="h-52 rounded-lg border bg-muted/30">
                <div className="space-y-3 p-4">
                  {selectedThread.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "rounded-lg border border-transparent bg-background p-3 shadow-sm",
                        message.isFlagged && "border-destructive/40"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{message.sender}</span>
                        <span>{message.sentAt}</span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message.content}</p>
                      {message.isFlagged && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
                          <FlagIcon className="size-3.5" />
                          Marked for follow-up
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Moderation workflow</p>
              <ul className="space-y-3">
                {selectedThread.workflow.map((step) => (
                  <li key={step.id} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <ArrowUpRight className="mt-1 size-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{step.timestamp}</p>
                      <p>{step.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Suggested next step</p>
              <p className="text-sm text-muted-foreground">{selectedThread.nextStep}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Watchers</p>
              <div className="flex flex-wrap gap-2">
                {selectedThread.watchers.map((watcher) => (
                  <Badge key={watcher} variant="outline">
                    {watcher}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline">
                <FlagIcon className="mr-2 size-4" />
                Flag follow-up
              </Button>
              <Button size="sm" variant="secondary">
                <Archive className="mr-2 size-4" />
                Archive thread
              </Button>
              <Button size="sm" variant="destructive">
                <AlertTriangle className="mr-2 size-4" />
                Escalate to management
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export default ModerationControls
