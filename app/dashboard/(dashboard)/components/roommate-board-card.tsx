import Link from "next/link"

import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import type { Tables } from "@/lib/supabase"

export default async function RoommateBoardCard() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, created_at, user_id")
    .or(`user_id.eq.${session.user.id},user_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(3)

  const highlights: Tables<"notifications">[] = !error && data ? data : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roommate board</CardTitle>
      </CardHeader>
      <CardContent>
        {highlights.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {highlights.map((item) => (
              <li key={item.id} className="space-y-1">
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.created_at
                    ? `${formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                      })}`
                    : "Moments ago"}
                </p>
                <p className="text-sm text-muted-foreground">{item.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No recent messages yet. Check back soon for roommate updates.
          </p>
        )}
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/messaging">Go to messages</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
