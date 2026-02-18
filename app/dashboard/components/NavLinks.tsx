"use client"

import React, { useEffect, useMemo, useState } from "react"
import { CrumpledPaperIcon, PersonIcon } from "@radix-ui/react-icons"
import { usePathname } from "next/navigation"

import SmartLink from "@/components/navigation/SmartLink"
import {
  getNavigationItems,
  resolveNavTreeForRole,
  type NavigationItem,
} from "@/config/navigation"
import type { AppRole } from "@/lib/auth-rbac"
import { fetchMemberRole } from "@/lib/data/members"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase-browser"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

const iconByNavId = {
  members: PersonIcon,
} as const

function resolveIcon(item: NavigationItem) {
  return iconByNavId[item.id as keyof typeof iconByNavId] ?? CrumpledPaperIcon
}

export default function NavLinks() {
  const pathname = usePathname()
  const [role, setRole] = useState<AppRole | null>(null)

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
          setRole((resolvedRole as AppRole | null) ?? null)
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

  const links = useMemo(() => {
    const tree = resolveNavTreeForRole(role)
    const navRole: AppRole = role ?? "tenant"

    return getNavigationItems(tree, {
      role: navRole,
      includeDisabled: true,
    })
  }, [role])

  return (
    <div className="space-y-5">
      {links.map((link) => {
        const Icon = resolveIcon(link)

        return (
          <SmartLink
            onClick={() => document.getElementById("sidebar-close")?.click()}
            href={link.href}
            key={link.id}
            className={cn("flex items-center gap-2 rounded-sm p-2", {
              "bg-gray-500 text-white dark:bg-gray-700": pathname === link.href,
              "pointer-events-none opacity-60": link.disabled,
            })}
            intent="navigation"
            aria-disabled={link.disabled}
          >
            <span className="flex items-center gap-2">
              <Icon />
              <span>{link.title}</span>
            </span>
          </SmartLink>
        )
      })}
    </div>
  )
}
