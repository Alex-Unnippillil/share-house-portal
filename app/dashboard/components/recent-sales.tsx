import { format, formatDistanceToNow } from "date-fns"

export type Reminder = {
  id: number
  title: string
  body: string
  scheduledFor: string
  dueDate?: string | null
  deliveredAt?: string | null
  choreTitle?: string | null
}

export function RecentSales({ reminders }: { reminders: Reminder[] }) {
  if (!reminders.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No chore reminders have been scheduled yet.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {reminders.map((reminder) => {
        const scheduledText = formatDistanceToNow(new Date(reminder.scheduledFor), {
          addSuffix: true,
        })
        const deliveredText =
          reminder.deliveredAt && !Number.isNaN(new Date(reminder.deliveredAt).getTime())
            ? formatDistanceToNow(new Date(reminder.deliveredAt), { addSuffix: true })
            : null
        const dueText =
          reminder.dueDate && !Number.isNaN(new Date(reminder.dueDate).getTime())
            ? format(new Date(reminder.dueDate), "MMM d, yyyy")
            : null

        return (
          <div
            key={reminder.id}
            className="space-y-2 rounded-lg border border-border p-3"
          >
            <div>
              <p className="text-sm font-medium leading-none">{reminder.title}</p>
              <p className="text-sm text-muted-foreground">{reminder.body}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {reminder.choreTitle ? (
                <span className="font-medium text-foreground">{reminder.choreTitle}</span>
              ) : null}
              {dueText ? <span>Due {dueText}</span> : null}
              <span>Scheduled {scheduledText}</span>
              {deliveredText ? <span>Sent {deliveredText}</span> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
