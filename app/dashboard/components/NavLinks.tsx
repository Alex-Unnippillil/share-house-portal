"use client"

import { useMemo } from "react"
import { PersonIcon, CrumpledPaperIcon } from "@radix-ui/react-icons"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { useUserProfile } from "@/hooks/use-user-profile"

export default function NavLinks() {
  const pathname = usePathname()
  const { data: profile } = useUserProfile()

  const role = profile?.role ?? null
  const isLandlord = useMemo(
    () => role === "property_manager" || role === "admin" || role === "landlord",
    [role]
  )

  const links = useMemo(
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
    [isLandlord]
  )

  return (
    <div className="space-y-5">
      {links.map((link, index) => {
        const Icon = link.Icon
        return (
          <Link
            onClick={() => document.getElementById("sidebar-close")?.click()}
            href={link.href}
            key={index}
            className={cn(
              "flex items-center gap-2 rounded-sm p-2",
              {
                " bg-gray-500 dark:bg-gray-700 text-white ": pathname === link.href,
              }
            )}
          >
            <Icon />
            {link.text}
          </Link>
        )
      })}
    </div>
  )
}
