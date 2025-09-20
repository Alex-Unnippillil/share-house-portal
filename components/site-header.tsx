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

export async function SiteHeader() {
  const {
    data: { session },
  } = await readUserSession()
  const isAuthenticated = Boolean(session)

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0 xs:space-x0">
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
                <Icons.gitHub className="h-5 w-5" />
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
                <Icons.twitter className="h-4 w-4 fill-current" />
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
