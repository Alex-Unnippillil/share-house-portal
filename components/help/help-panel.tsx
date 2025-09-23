"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { track } from "@vercel/analytics/react"

import {
  HelpDocumentResource,
  HelpVideoResource,
  resolveHelpContent,
} from "@/config/help"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type ViewedMap = Record<string, boolean>

type ResourceDescriptor =
  | (HelpDocumentResource & { resourceType: "doc" })
  | (HelpVideoResource & { resourceType: "video" })

function DocumentationLink({
  doc,
  viewed,
  onView,
}: {
  doc: HelpDocumentResource
  viewed: boolean
  onView: () => void
}) {
  return (
    <li key={doc.id}>
      <a
        href={doc.href}
        target="_blank"
        rel="noreferrer"
        onClick={onView}
        className={cn(
          "block rounded-lg border border-border/70 bg-background/40 p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          viewed && "border-primary/60 bg-primary/5"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold leading-tight text-foreground">
            {doc.title}
          </span>
          <span
            className={cn(
              "text-xs font-medium uppercase tracking-wide",
              viewed ? "text-primary" : "text-muted-foreground"
            )}
          >
            {viewed ? "Viewed" : "Docs"}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{doc.description}</p>
      </a>
    </li>
  )
}

function VideoLink({
  video,
  viewed,
  onView,
}: {
  video: HelpVideoResource
  viewed: boolean
  onView: () => void
}) {
  return (
    <li key={video.id}>
      <a
        href={video.href}
        target="_blank"
        rel="noreferrer"
        onClick={onView}
        className={cn(
          "block rounded-lg border border-border/70 bg-background/40 p-4 transition-colors hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          viewed && "border-primary/60 bg-primary/5"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-sm font-semibold leading-tight text-foreground">
              {video.title}
            </span>
            <p className="text-sm text-muted-foreground">{video.description}</p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs uppercase tracking-wide text-muted-foreground">
            <span>{video.duration}</span>
            <span className={cn("font-medium", viewed && "text-primary")}>{viewed ? "Viewed" : "Video"}</span>
          </div>
        </div>
      </a>
    </li>
  )
}

export function HelpPanel() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [viewedResources, setViewedResources] = useState<ViewedMap>({})

  const resolvedContent = useMemo(() => resolveHelpContent(pathname), [pathname])

  useEffect(() => {
    setViewedResources({})
  }, [resolvedContent.entryId])

  const markResourceViewed = useCallback(
    (resource: ResourceDescriptor) => {
      setViewedResources((previous) => {
        if (previous[resource.id]) {
          return previous
        }

        track("help_panel_resource_viewed", {
          route: resolvedContent.entryId,
          resourceId: resource.id,
          resourceType: resource.resourceType,
          href: resource.href,
          pathname,
        })

        return { ...previous, [resource.id]: true }
      })
    },
    [pathname, resolvedContent.entryId]
  )

  const anyResources =
    resolvedContent.docs.length > 0 || resolvedContent.videos.length > 0

  const documentationItems = resolvedContent.docs.map((doc) => ({
    ...doc,
    resourceType: "doc" as const,
  }))
  const videoItems = resolvedContent.videos.map((video) => ({
    ...video,
    resourceType: "video" as const,
  }))

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open help panel"
          className="text-muted-foreground transition hover:text-foreground"
        >
          <Icons.circleHelp className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex h-full max-h-screen w-full flex-col gap-6 sm:max-w-md"
      >
        <SheetHeader className="space-y-2 text-left">
          <SheetTitle className="text-xl font-semibold">Need a hand?</SheetTitle>
          <SheetDescription>
            Documentation and quick walkthroughs for {resolvedContent.label.toLowerCase()}.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-full pr-4">
          <div className="space-y-8 pb-12">
            {documentationItems.length > 0 && (
              <section aria-labelledby="help-panel-docs">
                <div className="flex items-center justify-between">
                  <h3 id="help-panel-docs" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Documentation
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {documentationItems.length} resource
                    {documentationItems.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="mt-3 space-y-3">
                  {documentationItems.map((doc) => (
                    <DocumentationLink
                      key={doc.id}
                      doc={doc}
                      viewed={Boolean(viewedResources[doc.id])}
                      onView={() => markResourceViewed(doc)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {videoItems.length > 0 && (
              <section aria-labelledby="help-panel-videos">
                <div className="flex items-center justify-between">
                  <h3 id="help-panel-videos" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Quick videos
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {videoItems.length} walk-through
                    {videoItems.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="mt-3 space-y-3">
                  {videoItems.map((video) => (
                    <VideoLink
                      key={video.id}
                      video={video}
                      viewed={Boolean(viewedResources[video.id])}
                      onView={() => markResourceViewed(video)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {!anyResources && (
              <p className="text-sm text-muted-foreground">
                We&apos;re preparing tailored guidance for this section. Check back soon!
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
