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
import { filterNavItems } from "@/lib/navigation"

export async function SiteHeader() {
  const {
    data: { session, activeRole, activeMembership },
  } = await readUserSession()

  const isAuthenticated = Boolean(session)
  const hasActiveMembership = Boolean(activeMembership)
  const navItems = filterNavItems({
    items: siteConfig.mainNav,
    isAuthenticated,
    activeRole,
    hasActiveMembership,
  })
  const canAccessDashboard = navItems.some((item) => item.href === "/dashboard")

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="xs:space-x0 container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <MainNav items={navItems} />
        <MobileNav
          isAuthenticated={isAuthenticated}
          canAccessDashboard={canAccessDashboard}
          navItems={navItems}
        />
        <div className="flex flex-1 items-center justify-end gap-4">
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <>
                {canAccessDashboard && (
                  <Link
                    href="/dashboard"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "justify-center"
                    )}
                  >
                    Dashboard
                  </Link>
                )}
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
            <Link
              href={siteConfig.links.github}
              target="_blank"
              rel="noreferrer"
            >
              <div
                className={buttonVariants({
                  size: "icon",
                  variant: "ghost",
                })}
              >
                <Icons.gitHub className="size-5" />
                <span className="sr-only">GitHub</span>
              </div>
            </Link>
            <Link
              href={siteConfig.links.twitter}
              target="_blank"
              rel="noreferrer"
            >
              <div
                className={buttonVariants({
                  size: "icon",
                  variant: "ghost",
                })}
              >
                <Icons.twitter className="size-4 fill-current" />
                <span className="sr-only">Twitter</span>
              </div>
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}
