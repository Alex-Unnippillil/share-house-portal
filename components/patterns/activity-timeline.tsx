import { cn } from "@/lib/utils"

export type TimelineItem = {
  id: string
  title: string
  description?: string
  timestamp: string
  meta?: string
}

type ActivityTimelineProps = {
  items: TimelineItem[]
  className?: string
}

export function ActivityTimeline({ items, className }: ActivityTimelineProps) {
  return (
    <ol className={cn("space-y-stack-md", className)}>
      {items.map((item, index) => (
        <li className="relative pl-8" key={item.id}>
          <span className="absolute left-0 top-2 size-3 rounded-full bg-brand-500" />
          {index < items.length - 1 && (
            <span className="absolute left-[5px] top-5 h-[calc(100%-0.25rem)] w-px bg-border" />
          )}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-body-md font-medium text-card-foreground">
                {item.title}
              </h3>
              <time className="text-label-sm text-muted-foreground">
                {item.timestamp}
              </time>
            </div>
            {item.description && (
              <p className="mt-2 text-body-sm text-muted-foreground">
                {item.description}
              </p>
            )}
            {item.meta && (
              <p className="mt-2 text-label-sm text-muted-foreground">
                {item.meta}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
