"use client"

import { useCallback, useState } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

type CopyButtonProps = {
  value: string
}

export function CopyButton({ value }: CopyButtonProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is not available")
      }

      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast({ title: "Link copied", description: "Invite link copied to your clipboard." })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy text", error)
      toast({
        title: "Unable to copy",
        description: "Copy the link manually if clipboard access is blocked.",
        variant: "destructive",
      })
    }
  }, [toast, value])

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      className="flex items-center gap-1"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      <span>{copied ? "Copied" : "Copy link"}</span>
    </Button>
  )
}
