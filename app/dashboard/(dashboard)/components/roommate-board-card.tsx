import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchRoommateMessages } from "@/lib/dashboard-data"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

export async function RoommateBoardCard() {
  const messages = await fetchRoommateMessages(4)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roommate board</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ul className="space-y-3">
          {messages.map((message) => (
            <li key={message.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{message.author}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(message.postedAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-muted-foreground">{message.body}</p>
            </li>
          ))}
        </ul>
        <Link href="/messaging" className="inline-block">
          <Button variant="outline" size="sm">
            Go to messages
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
