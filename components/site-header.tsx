import Link from "next/link"
import { readUserSession } from "@/utils/actions"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { MainNav } from "@/components/main-nav"
import { MobileNav } from "@/components/mobile-nav"
import { SignOutButton } from "@/components/sign-out-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { readSupabaseSessionFromCookie } from "@/utils/supabase-session"

interface SiteHeaderProps {
  initialIsAuthenticated?: boolean
}

export async function SiteHeader({ initialIsAuthenticated }: SiteHeaderProps = {}) {
  const cookieSession = readSupabaseSessionFromCookie()

  let isAuthenticated = initialIsAuthenticated ?? Boolean(cookieSession)

  if (!isAuthenticated) {
    const {
      data: { session },
    } = await readUserSession()

    isAuthenticated = Boolean(session)
  }

  return (
    <header
      className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      data-authenticated={isAuthenticated ? "true" : "false"}
    >
      <div className="xs:space-x0 container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <MainNav items={siteConfig.mainNav} />
        <MobileNav isAuthenticated={isAuthenticated} />
        <div className="flex flex-1 items-center justify-end gap-4">
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "justify-center"
                  )}
                >
                  Dashboard
                </Link>
                <SignOutButton
                  variant="outline"
                  size="sm"
                  className="justify-center"
                />
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "justify-center"
                  )}
                >
                  Log in
                </Link>
                <Link
                  href="/onboarding"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "justify-center"
                  )}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
          <nav className="flex items-center space-x-1">
            {isAuthenticated && <NotificationCenter />}
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}
