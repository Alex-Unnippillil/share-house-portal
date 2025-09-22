import type { ReactNode } from "react"

interface HelpLayoutProps {
  children: ReactNode
}

export default function HelpLayout({ children }: HelpLayoutProps) {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="prose prose-slate dark:prose-invert">
        {children}
      </div>
    </div>
  )
}
