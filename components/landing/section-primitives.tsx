import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type LandingSectionProps = {
  id: string
  headingId: string
  className?: string
  contentClassName?: string
  children: ReactNode
}

export function LandingSection({
  id,
  headingId,
  className,
  contentClassName,
  children,
}: LandingSectionProps) {
  return (
    <section id={id} aria-labelledby={headingId} className={className}>
      <div className={cn("container mx-auto px-4", contentClassName)}>{children}</div>
    </section>
  )
}

type SectionHeadingProps = {
  id: string
  title: string
  description?: string
  className?: string
}

export function SectionHeading({ id, title, description, className }: SectionHeadingProps) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      <h2 id={id} className="text-balance text-display-lg">
        {title}
      </h2>
      {description ? <p className="mt-4 text-muted-foreground">{description}</p> : null}
    </div>
  )
}
