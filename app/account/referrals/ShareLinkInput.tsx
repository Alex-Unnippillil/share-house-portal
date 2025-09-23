"use client"

import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard"

interface ShareLinkInputProps {
  referralLink: string
}

export function ShareLinkInput({ referralLink }: ShareLinkInputProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })
  const copied = Boolean(isCopied)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input value={referralLink} readOnly className="font-mono" />
      <Button
        type="button"
        variant={copied ? "secondary" : "outline"}
        onClick={() => copyToClipboard(referralLink)}
        className="sm:w-auto"
      >
        {copied ? (
          <>
            <Check className="mr-2 size-4" />
            Copied
          </>
        ) : (
          <>
            <Copy className="mr-2 size-4" />
            Copy link
          </>
        )}
      </Button>
    </div>
  )
}
