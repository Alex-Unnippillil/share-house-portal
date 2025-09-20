"use client"

import { useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { MessageCircle, Send, Tag } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type BoardMessage = {
  id: string
  author: string
  content: string
  timestamp: Date
  category: string
  pinned?: boolean
}

const categories = [
  { value: "general", label: "General" },
  { value: "maintenance", label: "Maintenance" },
  { value: "events", label: "Community events" },
]

const categoryTone: Record<string, string> = {
  general: "bg-secondary/60 text-secondary-foreground",
  maintenance: "bg-amber-500/15 text-amber-500",
  events: "bg-emerald-500/15 text-emerald-500",
}

const initialMessages: BoardMessage[] = [
  {
    id: "msg-1",
    author: "Taylor",
    content: "Reminder: compost pickup moved to Thursday morning. Please leave the bin by the front gate tonight.",
    timestamp: new Date(Date.now() - 1000 * 60 * 55),
    category: "maintenance",
    pinned: true,
  },
  {
    id: "msg-2",
    author: "Amanda",
    content: "Hosting a stretch and tea session in the studio Saturday at 10 AM. Bring a mug and playlist requests!",
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    category: "events",
  },
  {
    id: "msg-3",
    author: "Marco",
    content: "Pantry inventory restocked with oat milk and fresh fruit. Please update the sheet if you finish an item.",
    timestamp: new Date(Date.now() - 1000 * 60 * 260),
    category: "general",
  },
]

export function MessageBoard() {
  const [messages, setMessages] = useState<BoardMessage[]>(initialMessages)
  const [author, setAuthor] = useState("")
  const [content, setContent] = useState("")
  const [messageCategory, setMessageCategory] = useState(categories[0].value)
  const [activeFilter, setActiveFilter] = useState<"all" | string>("all")
  const [feedback, setFeedback] = useState<string | null>(null)

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => activeFilter === "all" || message.category === activeFilter)
  }, [activeFilter, messages])

  const pinnedMessages = useMemo(
    () => filteredMessages.filter((message) => message.pinned),
    [filteredMessages]
  )

  const regularMessages = useMemo(
    () => filteredMessages.filter((message) => !message.pinned),
    [filteredMessages]
  )

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!author.trim() || !content.trim()) {
      setFeedback("Please include your name and a message before posting.")
      return
    }

    const newMessage: BoardMessage = {
      id: `msg-${Date.now()}`,
      author: author.trim(),
      content: content.trim(),
      timestamp: new Date(),
      category: messageCategory,
    }

    setMessages((previous) => [newMessage, ...previous])
    setAuthor("")
    setContent("")
    setMessageCategory(categories[0].value)
    setFeedback("Message posted! Housemates will see it right away.")
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
              Community board
            </CardTitle>
            <CardDescription>
              Share updates, coordinate chores, and keep neighbours in the loop.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Label htmlFor="board-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
              Filter
            </Label>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger id="board-filter" className="w-full min-w-[180px] sm:w-[200px]">
                <SelectValue placeholder="Show all messages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All updates</SelectItem>
                {categories.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="board-author">Name</Label>
                <Input
                  id="board-author"
                  placeholder="Your name"
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="board-category">Topic</Label>
                <Select value={messageCategory} onValueChange={setMessageCategory}>
                  <SelectTrigger id="board-category" className="w-full">
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-message">Message</Label>
              <Textarea
                id="board-message"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Let everyone know about upcoming guests, deliveries, or plans."
                className="min-h-[140px]"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Messages are visible to all tenants. Management is notified automatically for maintenance posts.
              </p>
              <Button type="submit" className="sm:w-auto">
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                Post update
              </Button>
            </div>
          </form>
          {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
        </div>
        <div className="rounded-lg border bg-muted/30">
          <ScrollArea className="h-[420px] w-full rounded-lg">
            <div className="space-y-4 p-4">
              {pinnedMessages.length ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pinned</p>
                  {pinnedMessages.map((message) => (
                    <BoardMessageItem key={message.id} message={message} />
                  ))}
                  <Separator />
                </div>
              ) : null}
              {regularMessages.length ? (
                regularMessages.map((message) => (
                  <BoardMessageItem key={message.id} message={message} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No messages yet. Be the first to post an update!</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-xs text-muted-foreground">
        <p>
          Please keep the board respectful and relevant to the home. For urgent matters use the &quot;Maintenance&quot; topic or reach out
          directly.
        </p>
      </CardFooter>
    </Card>
  )
}

type BoardMessageItemProps = {
  message: BoardMessage
}

function BoardMessageItem({ message }: BoardMessageItemProps) {
  const tone = categoryTone[message.category] ?? categoryTone.general
  return (
    <div className="space-y-2 rounded-lg border bg-background/70 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{message.author}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </p>
        </div>
        <Badge className={cn("flex items-center gap-1 text-xs", tone)}>
          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
          {categories.find((option) => option.value === message.category)?.label ?? message.category}
        </Badge>
      </div>
      <p className="text-sm text-foreground">{message.content}</p>
      {message.pinned ? (
        <Badge variant="outline" className="text-[10px] uppercase">Pinned for everyone</Badge>
      ) : null}
    </div>
  )
}
