import type { ReactNode } from "react"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

/**
 * Public shell for anonymous/marketing-facing pages.
 *
 * Route exceptions:
 * - `/auth`, `/auth-server-action`, and `/signout` intentionally stay outside this group
 *   so they can render minimal, distraction-free auth surfaces.
 * - Authenticated application surfaces live in `app/(portal)`.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
