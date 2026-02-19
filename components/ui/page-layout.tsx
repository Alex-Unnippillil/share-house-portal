import * as React from "react"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

type DivProps = React.HTMLAttributes<HTMLDivElement>

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  withSeparator?: boolean
}

export function PageContainer({ className, ...props }: DivProps) {
  return (
    <div
      className={cn(
        "container max-w-7xl space-y-section px-content-gutter py-section",
        className
      )}
      {...props}
    />
  )
}

export function PageHeader({
  className,
  withSeparator = true,
  children,
  ...props
}: HeaderProps) {
  return (
    <header className={cn("space-y-stack-md", className)} {...props}>
      <div className="space-y-stack-sm">{children}</div>
      {withSeparator ? <Separator /> : null}
    </header>
  )
}

export function PageTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={cn("text-balance text-display-lg", className)} {...props} />
  )
}

export function PageDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-body-lg text-muted-foreground", className)}
      {...props}
    />
  )
}

export function SectionTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-heading-md", className)} {...props} />
}

export function SectionDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-body-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export function PageSection({ className, ...props }: DivProps) {
  return <section className={cn("space-y-stack-md", className)} {...props} />
}
