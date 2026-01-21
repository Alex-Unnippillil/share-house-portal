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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

import type { MessageFlagStatus } from "@/lib/messaging/escalation"

type FlagSeverity = "low" | "medium" | "high"

type ModerationMessage = {
  id: string
  sender: string
  sentAt: string
  content: string
  isFlagged?: boolean
}

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
  activeFlag: {
    id: string
    messageId: string
    status: MessageFlagStatus
    severity: FlagSeverity
  }
  messages: ModerationMessage[]
  workflow: {
    id: string
    timestamp: string
    description: string
  }[]
}

const initialModerationThreads: ModerationThread[] = [
  {
    id: "quiet-hours",
    subject: "Quiet hours disruption",
    unit: "Unit 3B",
    severity: "High",
    status: "Needs review",
    flags: 3,
    lastActivity: "2 hours ago",
    flaggedBy: "Aisha • Roommate",
    flaggedReason:
      "Three roommates reported repeated noise after 11pm quiet hours.",
    nextStep:
      "Escalate to onsite staff if the thread is still active after today's follow-up.",
    watchers: ["Night concierge", "Property care team"],
    activeFlag: {
      id: "c9bc6b0c-06cd-4c5f-a661-3e1e518d4e42",
      messageId: "d6b19f40-1f1c-4f44-9d2b-7286213b3f1d",
      status: "open",
      severity: "high",
    },
    messages: [
      {
        id: "d6b19f40-1f1c-4f44-9d2b-7286213b3f1d",
        sender: "Aisha",
        sentAt: "8:12 PM",
        content:
          "Could we please keep the TV volume down after quiet hours? It's been waking me up all week.",
        isFlagged: true,
      },
      {
        id: "7e3c45f8-2ed5-4f6e-8a75-760c293f0d9a",
        sender: "Jordan",
        sentAt: "8:18 PM",
        content:
          "Just seeing this now. I'll turn it down and make sure guests know the policy.",
      },
      {
        id: "0f08a9c6-6d97-452d-8a8d-4de06181fdd5",
        sender: "Automated moderation",
        sentAt: "8:19 PM",
        content:
          "Thread flagged for review: three quiet-hour violations detected this month.",
        isFlagged: true,
      },
    ],
    workflow: [
      {
        id: "quiet-wf-1",
        timestamp: "8:19 PM",
        description:
          "Policy engine flagged the thread for repeated quiet-hour violations.",
      },
      {
        id: "quiet-wf-2",
        timestamp: "8:21 PM",
        description:
          "Auto-reply reminded roommates of the quiet hours clause in the lease.",
      },
      {
        id: "quiet-wf-3",
        timestamp: "8:30 PM",
        description:
          "Awaiting property manager decision: escalate or archive once resolved.",
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
    flaggedReason:
      "Language in the thread is getting tense around shared grocery space.",
    nextStep:
      "Keep thread open but archive automatically if no new reports come in within 24 hours.",
    watchers: ["You", "Community standards"],
    activeFlag: {
      id: "9e3d8aa2-0fbb-4a95-9d2a-8a731b0f9d2e",
      messageId: "bc61a4bb-9a51-4562-8657-0cd86f7995e4",
      status: "open",
      severity: "medium",
    },
    messages: [
      {
        id: "15a4f6cd-5d36-4da0-9c83-8e2b3ba98e59",
        sender: "Diego",
        sentAt: "6:47 PM",
        content:
          "Friendly reminder to label leftovers—I'm finding a lot of unmarked containers again.",
      },
      {
        id: "e55feb9d-4f64-4beb-bcd7-94ea254ad0aa",
        sender: "Sam",
        sentAt: "6:52 PM",
        content:
          "Wasn't trying to be rude earlier. I'll clean the shelf tonight so we're reset.",
      },
      {
        id: "bc61a4bb-9a51-4562-8657-0cd86f7995e4",
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
        description:
          "Auto-moderation placed the thread in monitoring due to tone escalation.",
      },
      {
        id: "fridge-wf-2",
        timestamp: "7:01 PM",
        description:
          "Digest emailed a reminder of shared space etiquette to all roommates in Unit 2A.",
      },
      {
        id: "fridge-wf-3",
        timestamp: "7:15 PM",
        description:
          "No new reports detected. Archive will trigger automatically after 24 hours of calm.",
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
    flaggedReason:
      "Thread escalated to compliance to review documentation for a new service animal.",
    nextStep:
      "Waiting on compliance confirmation. Archive once paperwork is approved.",
    watchers: ["Compliance desk", "Pet policy reviewers"],
    activeFlag: {
      id: "0e0cb836-8f37-43c4-a4d3-4cb1379d6003",
      messageId: "bc9f1fe9-8c91-412d-9f86-1d46c6a24325",
      status: "escalated",
      severity: "low",
    },
    messages: [
      {
        id: "217a2aa8-4dbd-4a64-8669-9dd715da7b1d",
        sender: "Chris",
        sentAt: "7:55 PM",
        content:
          "I just submitted paperwork for my support dog. Let me know if you need anything else.",
      },
      {
        id: "bc9f1fe9-8c91-412d-9f86-1d46c6a24325",
        sender: "Maya (Manager)",
        sentAt: "8:02 PM",
        content:
          "Thanks, Chris! I'm escalating this to compliance to double-check everything.",
        isFlagged: true,
      },
      {
        id: "df3a7e05-0c4c-4308-a3aa-1efee75d1f81",
        sender: "Compliance desk",
        sentAt: "8:10 PM",
        content: "Paperwork received. We'll respond within one business day.",
      },
    ],
    workflow: [
      {
        id: "pet-wf-1",
        timestamp: "8:02 PM",
        description:
          "Property manager escalated the thread for documentation review.",
      },
      {
        id: "pet-wf-2",
        timestamp: "8:10 PM",
        description:
          "Compliance acknowledged receipt and assigned a reviewer.",
      },
      {
        id: "pet-wf-3",
        timestamp: "Pending",
        description:
          "Manager will archive the thread once compliance marks the request complete.",
      },
    ],
  },
]

const severityBadgeVariant: Record<
  ModerationThread["severity"],
  React.ComponentProps<typeof Badge>["variant"]
> = {
  High: "destructive",
  Medium: "secondary",
  Low: "outline",
}

const statusStyles: Record<ModerationThread["status"], string> = {
  "Needs review": "bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/30",
  Monitoring: "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/30",
  Escalated: "bg-purple-500/10 text-purple-700 ring-1 ring-purple-500/30",
}

const severityCopy: Record<FlagSeverity, "High" | "Medium" | "Low"> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      (data?.error?.message as string | undefined) ??
      "Unable to complete moderation action."
    throw new Error(message)
  }

  return data as Record<string, unknown>
}

export function ModerationControls() {
  const { toast } = useToast()
  const [threads, setThreads] = React.useState(initialModerationThreads)
  const [selectedThreadId, setSelectedThreadId] = React.useState(
    initialModerationThreads[0]?.id ?? ""
  )
  const [loadingAction, setLoadingAction] = React.useState<
    null | "flag" | "hide" | "escalate"
  >(null)

  const selectedThread = React.useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId),
    [threads, selectedThreadId]
  )

  const onSelectThread = (thread: ModerationThread) => {
    setSelectedThreadId(thread.id)
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

  const performAction = React.useCallback(
    async (action: "flag" | "hide" | "escalate") => {
      if (!selectedThread) return

      const { activeFlag } = selectedThread
      const flaggedMessage = selectedThread.messages.find(
        (message) => message.id === activeFlag.messageId
      )

      if (!flaggedMessage) {
        toast({
          variant: "destructive",
          title: "Moderation action failed",
          description: "No flagged message found for this thread.",
        })
        return
      }

      setLoadingAction(action)

      try {
        let response: Response

        if (action === "flag") {
          response = await fetch("/api/messages/flag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messageId: activeFlag.messageId,
              reason: selectedThread.flaggedReason,
              severity: activeFlag.severity,
            }),
          })
        } else if (action === "hide") {
          response = await fetch(`/api/messages/${activeFlag.messageId}/hide`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              flagId: activeFlag.id,
              reason: selectedThread.nextStep,
            }),
          })
        } else {
          response = await fetch(
            `/api/messages/${activeFlag.messageId}/flags/${activeFlag.id}/escalate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                notes: selectedThread.nextStep,
              }),
            }
          )
        }

        const payload = await parseResponse(response)

        setThreads((prev) => {
          return prev.map((thread) => {
            if (thread.id !== selectedThread.id) {
              return thread
            }

            if (action === "flag") {
              const flag = payload.flag as {
                id?: string
                status?: MessageFlagStatus
                severity?: FlagSeverity
              }

              return {
                ...thread,
                flags: thread.flags + 1,
                activeFlag: {
                  id: typeof flag?.id === "string" ? flag.id : thread.activeFlag.id,
                  messageId: thread.activeFlag.messageId,
                  status: (flag?.status ?? thread.activeFlag.status) as MessageFlagStatus,
                  severity: (flag?.severity ?? thread.activeFlag.severity) as FlagSeverity,
                },
              }
            }

            if (action === "hide" || action === "escalate") {
              const flag = payload.flag as {
                status?: MessageFlagStatus
              }

              const nextStatus = (flag?.status ?? thread.activeFlag.status) as MessageFlagStatus

              return {
                ...thread,
                status:
                  action === "escalate"
                    ? "Escalated"
                    : thread.status === "Escalated"
                      ? "Escalated"
                      : "Monitoring",
                activeFlag: {
                  ...thread.activeFlag,
                  status: nextStatus,
                },
              }
            }

            return thread
          })
        })

        toast({
          title:
            action === "flag"
              ? "Message flagged"
              : action === "hide"
                ? "Message hidden"
                : "Flag escalated",
          description:
            action === "flag"
              ? "Your flag has been recorded for moderator review."
              : action === "hide"
                ? "The flagged message is now hidden from the roommate board."
                : "Escalation sent to property management for follow-up.",
        })
      } catch (error) {
        const description =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while processing the moderation action."

        toast({
          variant: "destructive",
          title: "Moderation action failed",
          description,
        })
      } finally {
        setLoadingAction(null)
      }
    },
    [selectedThread, toast]
  )

  if (!selectedThread) {
    return null
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
              {threads.length} open items
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
                  {threads.map((thread) => (
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
                {severityCopy[selectedThread.activeFlag.severity]} severity
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => performAction("flag")}
                disabled={loadingAction !== null}
              >
                <FlagIcon className="mr-2 size-4" />
                Flag follow-up
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => performAction("hide")}
                disabled={loadingAction !== null}
              >
                <Archive className="mr-2 size-4" />
                Hide message
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => performAction("escalate")}
                disabled={loadingAction !== null}
              >
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
