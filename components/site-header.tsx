import Link from "next/link"

import { readUserContext } from "@/utils/actions"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { MainNav } from "@/components/main-nav"
import { MobileNav } from "@/components/mobile-nav"
import { SignOutButton } from "@/components/sign-out-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { TenantSwitcher } from "@/components/tenant-switcher"
import type { NavItem } from "@/types/nav"

export async function SiteHeader() {
  const { session, profile, tenants } = await readUserContext()
  const isAuthenticated = Boolean(session)
  const role = (profile?.role ?? (session?.user.app_metadata?.role as string | undefined))?.toLowerCase()
  const filteredNavItems = filterNavItems(siteConfig.mainNav, isAuthenticated, role)

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="xs:space-x0 container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex flex-1 items-center gap-4">
          <MainNav items={filteredNavItems} />
          {isAuthenticated && tenants.length > 1 ? (
            <TenantSwitcher tenants={tenants} className="hidden w-56 md:flex" />
          ) : null}
        </div>
        <MobileNav
          isAuthenticated={isAuthenticated}
          items={filteredNavItems}
          tenants={isAuthenticated ? tenants : []}
        />
        <div className="flex flex-1 items-center justify-end gap-4">
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "justify-center",
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
                  href="/auth/login"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "justify-center",
                  )}
                >
                  Log in
                </Link>
                <Link
                  href="/onboarding"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "justify-center",
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

function filterNavItems(items: NavItem[], isAuthenticated: boolean, role?: string | null) {
  return items.filter((item) => {
    if (item.requiresAuth && !isAuthenticated) {
      return false
    }
    if (item.guestOnly && isAuthenticated) {
      return false
    }
    if (item.roles && item.roles.length > 0) {
      if (!role) return false
      const normalizedRole = role.toLowerCase()
      return item.roles.some((allowedRole) => allowedRole.toLowerCase() === normalizedRole)
    }
    if (item.tenantsOnly && !isAuthenticated) {
      return false
    }
    return true
  })
}
