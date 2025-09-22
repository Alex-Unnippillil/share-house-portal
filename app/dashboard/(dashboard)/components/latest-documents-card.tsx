import Link from "next/link"

import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import type { Tables } from "@/lib/supabase"

export default async function LatestDocumentsCard() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  const { data, error } = await supabase
    .from("documents")
    .select("id, title, created_at, status")
    .or(`tenant_id.eq.${session.user.id},created_by.eq.${session.user.id}`)
    .order("created_at", { ascending: false })
    .limit(3)

  const documents: Tables<"documents">[] = !error && data ? data : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest documents</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {documents.map((document) => (
              <li key={document.id} className="space-y-1">
                <p className="font-medium">{document.title}</p>
                <p className="text-xs text-muted-foreground">
                  {document.created_at
                    ? format(new Date(document.created_at), "MMM d, yyyy")
                    : "Recently updated"}
                  {document.status ? ` · ${formatStatus(document.status)}` : null}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No recent documents available yet.
          </p>
        )}
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/documents">Open documents</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
