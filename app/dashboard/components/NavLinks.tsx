"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/utils/supabase-browser"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import { CrumpledPaperIcon, PersonIcon } from "@radix-ui/react-icons"

import { fetchMemberRole } from "@/lib/data/members"
import { cn } from "@/lib/utils"
import SmartLink from "@/components/navigation/SmartLink"

export default function NavLinks() {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const loadRole = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setRole(null)
          return
        }

        const typedSupabase = supabase as unknown as TypedSupabaseClient
        try {
          const resolvedRole = await fetchMemberRole(typedSupabase, user.id)
          setRole(resolvedRole || null)
        } catch (memberError) {
          console.error("Error loading member role", memberError)
          setRole(null)
        }
      } catch {
        setRole(null)
      }
    }

    loadRole()
  }, [])

  const isLandlord =
    role === "property_manager" || role === "admin" || role === "landlord"

  const links = isLandlord
    ? [
        {
          href: "/dashboard/operations",
          text: "Operations",
          Icon: CrumpledPaperIcon,
        },
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
      ]

  return (
    <div className="space-y-stack-sm">
      {links.map((link) => {
        const Icon = link.Icon
        return (
          <SmartLink
            onClick={() => document.getElementById("sidebar-close")?.click()}
            href={link.href}
            key={link.href}
            className={cn("flex items-center gap-2 rounded-sm p-2", {
              "bg-gray-500 text-white dark:bg-gray-700": pathname === link.href,
            })}
            intent="navigation"
          >
            <span className="flex items-center gap-2">
              <Icon />
              <span>{link.text}</span>
            </span>
          </SmartLink>
        )
      })}
    </div>
  )
}
