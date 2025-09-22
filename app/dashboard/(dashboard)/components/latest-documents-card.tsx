import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fetchRecentDocuments } from "@/lib/dashboard-data"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

export async function LatestDocumentsCard() {
  const documents = await fetchRecentDocuments(3)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3 text-sm">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  Updated {formatDate(doc.updatedAt)}
                </p>
              </div>
              <Badge variant={doc.status === "signed" ? "default" : "outline"} className="capitalize">
                {doc.status}
              </Badge>
            </li>
          ))}
        </ul>
        <Link href="/documents" className="inline-block">
          <Button variant="outline" size="sm">
            Open documents
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
