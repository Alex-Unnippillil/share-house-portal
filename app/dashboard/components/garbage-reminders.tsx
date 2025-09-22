import Link from 'next/link'
import { format, parseISO } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Assignment = {
  full_name: string | null
  email: string | null
}

type ReminderEvent = {
  id?: number
  eventDate: string
  summary: string
  materials: string[]
  description?: string | null
  allDay: boolean
  assignment?: Assignment | null
}

export type GarbageReminderEvent = ReminderEvent

interface GarbageRemindersProps {
  address?: string | null
  sourceUrl?: string | null
  dayOf: ReminderEvent[]
  tomorrow: ReminderEvent[]
  upcoming: ReminderEvent[]
}

const DATE_DISPLAY_FORMAT = 'EEE, MMM d'

export function GarbageReminders({
  address,
  sourceUrl,
  dayOf,
  tomorrow,
  upcoming,
}: GarbageRemindersProps) {
  const sections: Array<{
    title: string
    description: string
    empty: string
    items: ReminderEvent[]
  }> = [
    {
      title: 'Morning pick-up',
      description: 'Roll bins to the curb by 7:00 a.m.',
      empty: 'No scheduled pick-ups today.',
      items: dayOf,
    },
    {
      title: 'Prep tonight',
      description: 'Stage bins at the curb before bedtime.',
      empty: 'Nothing to prepare for tomorrow.',
      items: tomorrow,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Waste collection reminders</CardTitle>
        <CardDescription>
          {address ? `Tracking schedule for ${address}.` : 'Add your household address to see reminders.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map(section => (
          <div key={section.title} className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground">
                {section.title}
              </h3>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </div>
            <div className="space-y-3">
              {section.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{section.empty}</p>
              ) : (
                section.items.map(event => <Reminder key={`${event.eventDate}-${event.summary}`} event={event} />)
              )}
            </div>
          </div>
        ))}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground">
            Looking ahead
          </h3>
          {upcoming.length ? (
            <ul className="space-y-2 text-sm">
              {upcoming.map(event => (
                <li key={`${event.eventDate}-${event.summary}`} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{format(parseISO(event.eventDate), DATE_DISPLAY_FORMAT)}</span>
                  <span className="text-muted-foreground">{event.summary}</span>
                  {event.materials.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {event.materials.map(material => (
                        <Badge key={`${event.eventDate}-${material}`} variant="outline">
                          {material}
                        </Badge>
                      ))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No additional pick-ups scheduled yet.</p>
          )}
        </div>
        {sourceUrl ? (
          <p className="text-xs text-muted-foreground">
            Source:{' '}
            <Link href={sourceUrl} className="underline underline-offset-2" target="_blank" rel="noreferrer">
              Toronto waste collection calendar
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Reminder({ event }: { event: ReminderEvent }) {
  const title = format(parseISO(event.eventDate), DATE_DISPLAY_FORMAT)
  const assignee = event.assignment?.full_name ?? event.assignment?.email ?? 'Unassigned'

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{event.summary}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <span className="font-medium">Assigned:</span> {assignee}
        </div>
      </div>
      {event.description ? (
        <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
      ) : null}
      {event.materials.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {event.materials.map(material => (
            <Badge key={`${event.eventDate}-${material}`} variant="secondary">
              {material}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
