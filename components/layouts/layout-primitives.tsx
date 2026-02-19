import type { HTMLAttributes, PropsWithChildren } from "react"

import { cn } from "@/lib/utils"

type DivProps = HTMLAttributes<HTMLDivElement>

type ContentWidth = "default" | "wide" | "readable"

const contentWidthClasses: Record<ContentWidth, string> = {
  default: "max-w-7xl",
  wide: "max-w-screen-2xl",
  readable: "max-w-3xl",
}

export function AppShell({ className, ...props }: DivProps) {
  return <div className={cn("layout-shell", className)} {...props} />
}

export function ContentContainer({
  className,
  children,
  width = "default",
  ...props
}: PropsWithChildren<DivProps & { width?: ContentWidth }>) {
  return (
    <div
      className={cn("layout-content", contentWidthClasses[width], className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function SectionStack({ className, ...props }: DivProps) {
  return <div className={cn("section-stack", className)} {...props} />
}
