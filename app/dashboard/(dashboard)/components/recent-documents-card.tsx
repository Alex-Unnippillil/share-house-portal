import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardAudience, getRecentDocuments } from "../data"
import { Badge } from "@/components/ui/badge"
import SmartLink from "@/components/navigation/SmartLink"

const statusCopy: Record<"action_required" | "viewed" | "new", { label: string; variant: "default" | "outline" | "secondary" | "destructive" }>
  = {
    action_required: {
      label: "Action required",
      variant: "destructive",
    },
    viewed: {
      label: "Up to date",
      variant: "secondary",
    },
    new: {
      label: "New",
      variant: "default",
    },
  }

export async function RecentDocumentsCard() {
  const [documents, audience] = await Promise.all([
    getRecentDocuments(),
    getDashboardAudience(),
  ])

  const title =
    audience === "manager" ? "Portfolio documents" : "Documents & agreements"
  const description =
    audience === "manager"
      ? "Lease addenda, notices, and compliance files that need your attention."
      : "Your latest leases, policies, and shared notes in one place."
  const emptyCopy =
    audience === "manager"
      ? "Nothing needs your attention right now. We’ll highlight new resident documents as soon as they’re shared."
      : "You’re all caught up. New documents will appear here as they’re shared with your household."
  const ctaLabel =
    audience === "manager" ? "Open document library" : "Browse documents"

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.length ? (
          <ul className="space-y-3">
            {documents.map((document) => {
              const { label, variant } = statusCopy[document.status]
              return (
                <li
                  key={document.id}
                  className="flex items-start justify-between gap-4 rounded-md border border-transparent p-2 transition-colors hover:border-border/80"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{document.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {document.category} • Updated {new Date(document.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge variant={variant}>{label}</Badge>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyCopy}</p>
        )}

        <SmartLink href="/documents" className="inline-flex" intent="standard">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            {ctaLabel}
          </Button>
        </SmartLink>
      </CardContent>
    </Card>
  )
}
