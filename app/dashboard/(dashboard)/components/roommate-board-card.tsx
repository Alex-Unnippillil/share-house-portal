import { MessageSquare } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { getRoommateUpdates } from "../data"
import { RoommateBoardRealtime } from "./roommate-board-realtime"

export async function RoommateBoardCard() {
  const updates = await getRoommateUpdates()

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="size-5 text-primary" />
            Roommate board
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Keep the household in sync with quick updates and replies.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <RoommateBoardRealtime initialUpdates={updates} />
      </CardContent>
    </Card>
  )
}
