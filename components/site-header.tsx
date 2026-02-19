import SmartLink from "@/components/navigation/SmartLink"
import { MainNav } from "@/components/main-nav"
import { MobileNav } from "@/components/mobile-nav"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { SignOutButton } from "@/components/sign-out-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { getRoleNavigation, type PortalRole, publicNav } from "@/config/navigation"
import { siteConfig } from "@/config/site"
import { fetchMemberRole } from "@/lib/data/members"
import { cn } from "@/lib/utils"
import { readUserSession } from "@/utils/actions"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

export async function SiteHeader() {
  const {
    data: { session },
  } = await readUserSession()
  const isAuthenticated = Boolean(session)

  let role: PortalRole | null = null
  if (session?.user?.id) {
    try {
      const supabase = await createSupbaseServerClientReadOnly()
      const resolvedRole = await fetchMemberRole(supabase as any, session.user.id)
      if (
        resolvedRole === "tenant" ||
        resolvedRole === "roommate" ||
        resolvedRole === "property_manager" ||
        resolvedRole === "admin"
      ) {
        role = resolvedRole
      }
    } catch (error) {
      console.error("Failed to resolve member role for site header", error)
    }
  }

  const roleNavigation = getRoleNavigation(role)
  const navItems = isAuthenticated ? roleNavigation.primaryNav : publicNav

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to content
      </a>
      <div className="container flex h-16 items-center justify-between gap-4">
        <MainNav appName={siteConfig.name} items={navItems} />
        <MobileNav appName={siteConfig.name} isAuthenticated={isAuthenticated} items={navItems} />
        <div className="flex flex-1 items-center justify-end gap-4">
          <div className="hidden items-center gap-2 lg:flex">
            {isAuthenticated ? (
              <>
                <SignOutButton variant="outline" size="sm" className="justify-center" />
              </>
            ) : (
              <>
                <SmartLink
                  href="/auth"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2")}
                  intent="navigation"
                >
                  Log in
                </SmartLink>
                <SmartLink
                  href="/onboarding"
                  className={cn(buttonVariants({ size: "sm" }), "justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2")}
                  intent="navigation"
                >
                  Sign up
                </SmartLink>
              </>
            )}
          </div>
          <nav className="flex items-center space-x-1" aria-label="Secondary actions">
            {isAuthenticated && <NotificationCenter />}
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}
