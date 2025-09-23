"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { shareThread } from "@/lib/share/outbound"

interface ShareThreadButtonProps {
  thread: {
    id: string
    title: string
    summary: string
    category?: string
    participants?: number
    lastMessageAt?: string
    href: string
  }
}

export function ShareThreadButton({ thread }: ShareThreadButtonProps) {
  const [pending, setPending] = useState(false)

  const handleShare = async () => {
    setPending(true)
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : undefined
      const status = await shareThread(
        {
          id: thread.id,
          title: thread.title,
          summary: thread.summary,
          category: thread.category,
          participants: thread.participants,
          lastMessageAt: thread.lastMessageAt,
          href: thread.href,
        },
        { baseUrl },
      )

      if (status === "shared") {
        toast.success("Thread shared with your device")
      } else if (status === "copied") {
        toast.success("Thread link copied to clipboard")
      } else if (status === "unsupported") {
        toast.error("Sharing is not supported on this device")
      }
    } catch (error) {
      console.error("Failed to share thread", error)
      toast.error("Unable to share thread")
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleShare}
      disabled={pending}
    >
      <Share2 className="size-4" aria-hidden />
      {pending ? "Sharing…" : "Share thread"}
    </Button>
  )
}
