"use client"

import * as React from "react"

import { TtsToolbar } from "@/components/tts-toolbar"
import { cn } from "@/lib/utils"

interface InteractiveMdxArticleProps extends React.PropsWithChildren {
  className?: string
}

export function InteractiveMdxArticle({ children, className }: InteractiveMdxArticleProps) {
  const contentRef = React.useRef<HTMLDivElement>(null)

  return (
    <div className="flex flex-col gap-6">
      <TtsToolbar containerRef={contentRef} />
      <article className={cn(className)} ref={contentRef}>
        {children}
      </article>
    </div>
  )
}
