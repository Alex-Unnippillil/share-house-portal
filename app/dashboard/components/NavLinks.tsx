"use client"

import * as React from "react"
import { CrumpledPaperIcon, PersonIcon } from "@radix-ui/react-icons"
import { usePathname } from "next/navigation"

import SmartLink from "@/components/navigation/SmartLink"
import { useFavorites } from "@/components/navigation/FavoritesPanel"
import { fetchMemberRole } from "@/lib/data/members"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase-browser"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

type NavLinkEntry = {
  href: string
  text: string
  Icon: typeof PersonIcon
}

export default function NavLinks() {
  const pathname = usePathname()
  const { favorites } = useFavorites()
  const [role, setRole] = React.useState<string | null>(null)

  React.useEffect(() => {
    const loadRole = async () => {
      try {
        const supabase = createClient() as unknown as TypedSupabaseClient
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setRole(null)
          return
        }

        try {
          const resolvedRole = await fetchMemberRole(supabase, user.id)
          setRole(resolvedRole || null)
        } catch (memberError) {
          console.error("Error loading member role", memberError)
          setRole(null)
        }
      } catch (error) {
        console.error("Unable to load Supabase user", error)
        setRole(null)
      }
    }

    void loadRole()
  }, [])

  const isLandlord =
    role === "property_manager" || role === "admin" || role === "landlord"

  const baseLinks: NavLinkEntry[] = React.useMemo(
    () =>
      isLandlord
        ? [
            { href: "/dashboard/members", text: "Members", Icon: PersonIcon },
            { href: "/payments", text: "Payments", Icon: CrumpledPaperIcon },
            { href: "/documents", text: "Documents", Icon: CrumpledPaperIcon },
            { href: "/messaging", text: "Message Board", Icon: CrumpledPaperIcon },
          ]
        : [
            { href: "/payments", text: "Payments", Icon: CrumpledPaperIcon },
            { href: "/documents", text: "My Lease", Icon: CrumpledPaperIcon },
            { href: "/messaging", text: "Message Board", Icon: CrumpledPaperIcon },
            { href: "/chores", text: "Chores", Icon: CrumpledPaperIcon },
            { href: "/supplies", text: "Supplies", Icon: CrumpledPaperIcon },
          ],
    [isLandlord],
  )

  const navigationFavorites = React.useMemo(
    () =>
      favorites.filter(
        (favorite) =>
          favorite.entityType === "navigation" &&
          Boolean(favorite.metadata?.href ?? favorite.entityId),
      ),
    [favorites],
  )

  const pinnedHrefs = React.useMemo(() => {
    const hrefs = navigationFavorites
      .map((favorite) => favorite.metadata?.href ?? favorite.entityId)
      .filter((href): href is string => Boolean(href))
    return new Set(hrefs)
  }, [navigationFavorites])

  const linksToRender = React.useMemo(
    () => baseLinks.filter((link) => !pinnedHrefs.has(link.href)),
    [baseLinks, pinnedHrefs],
  )

  return (
    <div className="space-y-6">
      {navigationFavorites.length > 0 && (
        <section className="space-y-2">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Favorites
          </p>
          <div className="space-y-2">
            {navigationFavorites.map((favorite) => {
              const href = favorite.metadata?.href ?? favorite.entityId

              return (
                <SmartLink
                  key={`favorite-${favorite.id}`}
                  href={href}
                  onClick={() => document.getElementById("sidebar-close")?.click()}
                  className={cn(
                    "flex items-center gap-2 rounded-sm p-2",
                    pathname === href
                      ? "bg-gray-500 text-white dark:bg-gray-700"
                      : undefined,
                  )}
                  intent="navigation"
                  favorite={{
                    entityType: favorite.entityType,
                    entityId: favorite.entityId,
                    metadata: favorite.metadata,
                  }}
                >
                  {favorite.metadata?.label ?? favorite.entityId}
                </SmartLink>
              )
            })}
          </div>
        </section>
      )}

      <div className="space-y-3">
        {linksToRender.map((link) => (
          <SmartLink
            key={link.href}
            onClick={() => document.getElementById("sidebar-close")?.click()}
            href={link.href}
            className={cn(
              "flex items-center gap-2 rounded-sm p-2",
              pathname === link.href
                ? " bg-gray-500 text-white dark:bg-gray-700"
                : undefined,
            )}
            intent="navigation"
            favorite={{
              entityType: "navigation",
              entityId: link.href,
              metadata: { label: link.text, href: link.href },
            }}
          >
            <link.Icon />
            {link.text}
          </SmartLink>
        ))}
      </div>
    </div>
  )
}
