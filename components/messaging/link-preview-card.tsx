/* eslint-disable @next/next/no-img-element */
import { Globe, ImageOff, Link as LinkIcon } from "lucide-react"
import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { LinkPreviewData } from "@/types/link-preview"

export type LinkPreviewCardProps = {
  preview: LinkPreviewData
  onRemove?: () => void
} & ComponentProps<"div">

const resolveHostname = (url: string, fallback?: string | null) => {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch (error) {
    return fallback ?? null
  }
}

const hasPreviewDetails = (preview: LinkPreviewData) =>
  Boolean(preview.title || preview.description || preview.image)

export const LinkPreviewCard = ({
  preview,
  onRemove,
  className,
  ...props
}: LinkPreviewCardProps) => {
  const host = resolveHostname(preview.url, preview.siteName)
  const title = preview.title ?? preview.siteName ?? host ?? preview.url
  const description =
    preview.description ??
    (hasPreviewDetails(preview)
      ? null
      : "We couldn't load a full preview, but the link is still available.")

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/70 bg-muted/40",
        className
      )}
      {...props}
    >
      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-7 px-2 text-xs text-muted-foreground"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onRemove()
          }}
        >
          Remove preview
        </Button>
      ) : null}

      <a
        href={preview.url}
        target="_blank"
        rel="noreferrer noopener"
        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch"
      >
        <div className="sm:w-32">
          {preview.image ? (
            <div className="aspect-video overflow-hidden rounded-md border border-border/60 bg-background">
              <img
                src={preview.image}
                alt={title}
                className="size-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border/60 bg-background/60">
              <ImageOff className="size-5 text-muted-foreground" aria-hidden />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {preview.favicon ? (
              <img
                src={preview.favicon}
                alt=""
                className="size-4 rounded-sm border border-border/60 object-cover"
                loading="lazy"
              />
            ) : (
              <Globe className="size-4" aria-hidden />
            )}
            {host ? <span className="truncate">{host}</span> : null}
          </div>

          <div className="space-y-1">
            <p className="flex items-start gap-1 text-sm font-semibold text-foreground">
              <LinkIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="line-clamp-2 break-words">{title}</span>
            </p>
            {description ? (
              <p className="line-clamp-3 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </a>
    </div>
  )
}
