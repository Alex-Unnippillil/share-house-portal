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

export default function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
	const pathname = usePathname();
	const [role, setRole] = useState<string | null>(null);

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
		<div className="space-y-5">
			{links.map((link, index) => {
				const Icon = link.Icon;
				return (
                                        <SmartLink
                                                onClick={onNavigate}
                                                href={link.href}
                                                key={index}
                                                className={cn(
                                                        "flex items-center gap-2 rounded-sm p-2",
                                                        {
                                                                " bg-gray-500 dark:bg-gray-700 text-white ":
                                                                        pathname === link.href,
                                                        }
                                                )}
                                                intent="navigation"
                                        >
                                                <span className="flex items-center gap-2">
                                                        <Icon />
                                                        <span>{link.text}</span>
                                                </span>
                                        </SmartLink>
                                );
                        })}
                </div>
        );
}
