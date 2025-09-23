import { ExternalLink } from "lucide-react"

import { cn } from "@/lib/utils"
import { LinkPreview, safeHostname } from "@/lib/messaging/link-previews"

type LinkPreviewCardProps = {
  preview: LinkPreview
}

export function LinkPreviewCard({ preview }: LinkPreviewCardProps) {
  const host = safeHostname(preview.canonicalUrl || preview.url)
  const hostInitial = host.charAt(0).toUpperCase()
  const description =
    preview.description ?? (preview.status === "error" ? "Preview unavailable — open link to view." : undefined)

  return (
    <a
      href={preview.canonicalUrl || preview.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex w-full overflow-hidden rounded-lg border bg-background transition",
        preview.status === "error"
          ? "border-dashed border-border/70 hover:border-border"
          : "border-border/70 hover:border-primary/50 hover:shadow-sm"
      )}
      data-testid="link-preview-card"
    >
      <div className="flex flex-1 flex-col justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          {preview.favicon ? (
            <img
              src={preview.favicon}
              alt={`${host} favicon`}
              width={24}
              height={24}
              className="size-6 rounded"
            />
          ) : (
            <div className="flex size-6 items-center justify-center rounded bg-muted text-xs font-semibold uppercase text-muted-foreground">
              {hostInitial || "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{preview.title ?? host}</p>
            <p className="truncate text-xs text-muted-foreground">{preview.siteName ?? host}</p>
          </div>
          <ExternalLink className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
        {description ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {preview.image ? (
        <div className="relative hidden h-full w-36 flex-none overflow-hidden sm:block">
          <img
            src={preview.image}
            alt={preview.title ?? preview.siteName ?? host}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
    </a>
  )
}

