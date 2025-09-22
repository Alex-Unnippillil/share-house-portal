import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

import { getRoommateBoardHighlights } from '../data'

export async function RoommateBoardCard() {
  const messages = await getRoommateBoardHighlights()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roommate board</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {messages.map((message) => (
            <li key={message.id}>
              <span className="font-medium">{message.author}:</span> {message.body}
            </li>
          ))}
        </ul>
        <Link href="/messaging" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            Go to messages
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
