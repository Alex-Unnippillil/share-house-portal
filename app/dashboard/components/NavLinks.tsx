"use client";

import React, { useMemo } from "react";
import { PersonIcon, CrumpledPaperIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import type { BuildingRole } from "@/types/auth";

type DashboardNavLink = {
  href: string;
  text: string;
  Icon: React.ElementType;
  allowedRoles: BuildingRole[];
};

export const DASHBOARD_NAV_LINKS: DashboardNavLink[] = [
  {
    href: "/dashboard/members",
    text: "Members",
    Icon: PersonIcon,
    allowedRoles: ["property_manager", "admin"],
  },
  {
    href: "/dashboard/todo",
    text: "Todo",
    Icon: CrumpledPaperIcon,
    allowedRoles: ["tenant", "roommate", "property_manager", "admin"],
  },
];

type NavLinksProps = {
  activeRole: BuildingRole | null;
  links?: DashboardNavLink[];
};

export default function NavLinks({
  activeRole,
  links = DASHBOARD_NAV_LINKS,
}: NavLinksProps) {
  const pathname = usePathname();

  const visibleLinks = useMemo(() => {
    if (!activeRole) {
      return [];
    }

    return links.filter((link) => link.allowedRoles.includes(activeRole));
  }, [links, activeRole]);

  if (visibleLinks.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-border p-4 text-sm text-muted-foreground">
        No navigation items available for your current role.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {visibleLinks.map((link) => {
        const Icon = link.Icon;
        return (
          <Link
            onClick={() =>
              document.getElementById("sidebar-close")?.click()
            }
            href={link.href}
            key={link.href}
            className={cn(
              "flex items-center gap-2 rounded-sm p-2",
              {
                "bg-gray-500 text-white dark:bg-gray-700":
                  pathname === link.href,
              }
            )}
          >
            <Icon />
            {link.text}
          </Link>
        );
      })}
    </div>
  );
}