"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Copy } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ReferenceCodeCardProps = {
  code: string
  memoLabel: string
  documentationUrl: string
  invoiceId: string
}

export function ReferenceCodeCard({
  code,
  memoLabel,
  documentationUrl,
  invoiceId,
}: ReferenceCodeCardProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setCopyError(null)
      setTimeout(() => setCopied(false), 2200)
    } catch (error) {
      console.error("Unable to copy e-Transfer reference code", error)
      setCopyError("Copying failed. Manually type the code into your transfer memo.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice memo reference</CardTitle>
        <CardDescription>
          Paste this code into your bank&apos;s {memoLabel.toLowerCase()} field so we can
          reconcile e-Transfers against invoice {invoiceId} automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="uppercase tracking-wide">
            Required
          </Badge>
          <span className="font-mono text-2xl tracking-[0.3em] text-primary">
            {code}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-label={`Copy reference code ${code}`}
          >
            {copied ? (
              <>
                <Check className="mr-2 size-4" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 size-4" aria-hidden="true" />
                Copy code
              </>
            )}
          </Button>
          <span className="sr-only" aria-live="polite">
            {copied ? "Reference code copied to clipboard" : ""}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Transfers that arrive without this memo code have to be reconciled manually
          and may be delayed in the ledger until an admin reviews the deposit.
        </p>
        <p className="text-sm text-muted-foreground">
          Need help? Review the
          <Link
            href={documentationUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            manual e-Transfer fallback guide
          </Link>
          .
        </p>
        {copyError ? (
          <p className="text-sm font-medium text-destructive">{copyError}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
