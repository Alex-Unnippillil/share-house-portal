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
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-center")}
                  intent="navigation"
                >
                  Log in
                </SmartLink>
                <SmartLink
                  href="/onboarding"
                  className={cn(buttonVariants({ size: "sm" }), "justify-center")}
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
