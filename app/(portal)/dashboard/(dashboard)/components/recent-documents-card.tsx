import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRecentDocuments } from "../data"
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
  const documents = await getRecentDocuments()

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="space-y-1">
          <CardTitle>Documents & agreements</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your latest leases, policies, and shared notes in one place.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {documents.map((document) => {
            const { label, variant } = statusCopy[document.status]
            return (
              <li
                key={document.name}
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

        <SmartLink href="/documents" className="inline-flex" intent="standard">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            Browse documents
          </Button>
        </SmartLink>
      </CardContent>
    </Card>
  )
}
