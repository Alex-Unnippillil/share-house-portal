"use client"

import { useState } from "react"
import { Flag, MoreHorizontal, Pin, Trash2, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { ModerationInput } from "./messages-provider"

interface ModerationMenuProps {
  messageId: string
  isPinned: boolean
  isDeleted: boolean
  flagged: boolean
  onModerate: (input: ModerationInput) => Promise<void>
}

export default function ModerationMenu({
  messageId,
  isPinned,
  isDeleted,
  flagged,
  onModerate,
}: ModerationMenuProps) {
  const [isWorking, setIsWorking] = useState(false)

  const runAction = async (action: ModerationInput["action"]) => {
    setIsWorking(true)
    try {
      await onModerate({ messageId, action })
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Moderation actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 text-sm">
        <DropdownMenuItem disabled={isWorking} onSelect={() => runAction(isPinned ? "unpin" : "pin")}>
          <Pin className="mr-2 size-4" /> {isPinned ? "Unpin" : "Pin"} message
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isWorking} onSelect={() => runAction(isDeleted ? "restore" : "delete")}>
          {isDeleted ? (
            <Undo2 className="mr-2 size-4" />
          ) : (
            <Trash2 className="mr-2 size-4" />
          )}
          {isDeleted ? "Restore" : "Delete"} message
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isWorking}
          onSelect={() => runAction(flagged ? "resolve_flag" : "flag")}
        >
          <Flag className="mr-2 size-4" /> {flagged ? "Resolve flag" : "Flag message"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
