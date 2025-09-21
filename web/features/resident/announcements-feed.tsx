'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAnnouncementsFeed } from './hooks'

const categoryVariants: Record<'events' | 'maintenance' | 'community', 'secondary' | 'outline' | 'default'> = {
  events: 'secondary',
  maintenance: 'default',
  community: 'outline',
}

const formatPublishedAt = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))

export const AnnouncementsFeed = () => {
  const { data, isLoading, isError, error } = useAnnouncementsFeed()

  return (
    <Card aria-labelledby="announcements-heading">
      <CardHeader>
        <CardTitle id="announcements-heading" className="text-xl">
          Building announcements
        </CardTitle>
        <CardDescription>Catch up on the latest updates from management and the community.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            Loading announcements…
          </p>
        ) : isError ? (
          <p role="alert" className="text-sm text-destructive">
            {(error as Error).message || 'Unable to load announcements.'}
          </p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet. Check back soon!</p>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="space-y-4 pr-2">
              {data.map(announcement => (
                <li key={announcement.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{announcement.title}</p>
                    <Badge variant={categoryVariants[announcement.category]} className="capitalize">
                      {announcement.category}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{announcement.body}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Posted {formatPublishedAt(announcement.publishedAt)} by {announcement.author}
                  </p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
