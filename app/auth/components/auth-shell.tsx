import Link from "next/link"

import { Icons } from "@/components/icons"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

type AuthShellProps = {
  title: string
  description?: string
  className?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthShell({
  title,
  description,
  className,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="mt-10 px-4 py-8 lg:p-12">
      <div className={cn("mx-auto flex w-full max-w-md flex-col space-y-6", className)}>
        <div className="flex flex-col items-center space-y-3 text-center">
          <Link href="/" className="flex items-center space-x-2">
            <Icons.logo className="size-8" />
            <span className="inline-block font-bold">{siteConfig.name}</span>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="rounded-xl border bg-background/60 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
          {children}
        </div>
        {footer ? (
          <div className="text-center text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
