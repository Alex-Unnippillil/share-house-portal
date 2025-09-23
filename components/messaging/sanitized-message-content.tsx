"use client"

import DOMPurify from "isomorphic-dompurify"
import type { Config } from "dompurify"
import { useMemo } from "react"

import { cn } from "@/lib/utils"

const SANITIZE_OPTIONS: Config = {
  ALLOWED_TAGS: [
    "a",
    "b",
    "br",
    "code",
    "em",
    "i",
    "p",
    "span",
    "strong",
    "ul",
    "ol",
    "li",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
}

type SanitizedMessageContentProps = {
  html: string
  className?: string
}

export function SanitizedMessageContent({ html, className }: SanitizedMessageContentProps) {
  const sanitized = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        ...SANITIZE_OPTIONS,
        RETURN_TRUSTED_TYPE: false,
      }),
    [html]
  )

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}

export default SanitizedMessageContent
