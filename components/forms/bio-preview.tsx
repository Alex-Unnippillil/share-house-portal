import { sanitizeBioHtml } from "@/lib/bio"

interface BioPreviewProps {
  html: string
}

export function BioPreview({ html }: BioPreviewProps) {
  const sanitized = sanitizeBioHtml(html)

  if (!sanitized) {
    return (
      <p className="text-sm text-muted-foreground">
        Your bio preview will appear here once you start typing.
      </p>
    )
  }

  return (
    <div className="rounded-md border border-dashed border-muted-foreground/50 bg-muted/30 p-4 text-sm leading-6">
      <div
        className="space-y-2"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </div>
  )
}
