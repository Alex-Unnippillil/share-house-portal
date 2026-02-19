"use client"

import { Flag, Lock, Megaphone, Pin, ShieldCheck, Unlock } from "lucide-react"

import { moderateThreadAction, publishAnnouncementAction } from "@/app/(portal)/messaging/actions"
import type { ActiveThread, CurrentMessagingUser } from "@/app/(portal)/messaging/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ModerationControlsProps = {
  currentUser: CurrentMessagingUser | null
  activeThread: ActiveThread | null
}

export default function ModerationControls({
  currentUser,
  activeThread,
}: ModerationControlsProps) {
  if (!currentUser?.canModerate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Moderation controls</CardTitle>
          <CardDescription>
            Only property managers and admins can pin, flag, lock, or remove thread content.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="size-5 text-primary" /> Thread moderation
          </CardTitle>
          <CardDescription>
            Apply moderation actions for the active thread. Each action writes an audit entry.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">Role: {currentUser.role}</Badge>
            {activeThread?.pinned ? <Badge>Pinned</Badge> : null}
            {activeThread?.locked ? <Badge variant="secondary">Locked</Badge> : null}
          </div>
          {activeThread ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <ModerationButton icon={Pin} label={activeThread.pinned ? "Unpin" : "Pin"} action={activeThread.pinned ? "unpin" : "pin"} threadId={activeThread.id} />
              <ModerationButton icon={Flag} label="Flag" action="flag" threadId={activeThread.id} />
              <ModerationButton icon={activeThread.locked ? Unlock : Lock} label={activeThread.locked ? "Unlock" : "Lock"} action={activeThread.locked ? "unlock" : "lock"} threadId={activeThread.id} />
              <ModerationButton icon={ShieldCheck} label="Delete" action="delete" threadId={activeThread.id} variant="destructive" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a thread to enable moderation actions.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="size-5 text-primary" /> Publish announcement
          </CardTitle>
          <CardDescription>
            Publish manager announcements with optional scheduling and pinned visibility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={publishAnnouncementAction} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="announcement-title">Title</Label>
              <Input id="announcement-title" name="title" placeholder="Water shutoff tomorrow" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="announcement-body">Message</Label>
              <Textarea id="announcement-body" name="body" rows={4} placeholder="Please avoid using taps from 10:00 to 13:00 while repairs are in progress." required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="announcement-category">Category</Label>
              <Input id="announcement-category" name="category" defaultValue="announcement" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="announcement-schedule">Schedule for (optional)</Label>
              <Input id="announcement-schedule" name="scheduleAt" type="datetime-local" />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" name="pin" className="size-4 rounded border-border" />
              Pin this thread for tenant visibility.
            </label>
            <Button type="submit" className="w-full">Publish announcement</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}

type ModerationButtonProps = {
  icon: typeof Pin
  label: string
  action: string
  threadId: string
  variant?: "default" | "destructive"
}

function ModerationButton({
  icon: Icon,
  label,
  action,
  threadId,
  variant = "default",
}: ModerationButtonProps) {
  return (
    <form action={moderateThreadAction}>
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" variant={variant} className="w-full justify-start">
        <Icon className="mr-2 size-4" />
        {label}
      </Button>
    </form>
  )
}
