"use client"

import { formatDistanceToNow, parseISO } from "date-fns"
import { MessageCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

import type { MessageRow } from "../lib/types"

type MessagingFeedProps = {
  messages: MessageRow[]
  canView: boolean
}

export function MessagingFeed({ messages, canView }: MessagingFeedProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircle className="size-4 text-indigo-500" />
          Message Center
        </CardTitle>
      </CardHeader>
      <CardContent>
        {canView ? (
          messages.length ? (
            <ScrollArea className="h-[260px] pr-4">
              <ul className="space-y-4 text-sm">
                {messages.map((message) => (
                  <li key={message.id} className="space-y-1 border-b pb-3 last:border-b-0 last:pb-0">
                    <p className="font-medium text-foreground">
                      {message.threads?.title ?? "General"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(message.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {message.body}
                    </p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">
              No recent activity in building channels.
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Message board access is limited for this role.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

