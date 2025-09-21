"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { AppRole } from "@/config/rbac";
import { getNavGroupsForRole } from "@/config/rbac";

type MainNavProps = ComponentPropsWithoutRef<"nav"> & {
  role: AppRole;
};

export function MainNav({ className, role, ...props }: MainNavProps) {
  const pathname = usePathname();
  const [hash, setHash] = useState<string>("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  const items = useMemo(
    () => getNavGroupsForRole(role).flatMap((group) => group.items),
    [role]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className={cn(
        "flex flex-wrap items-center gap-3 text-sm font-medium", 
        className
      )}
      {...props}
    >
      {items.map((item) => {
        const [baseHref, hashFragment] = item.href.split("#");
        const itemHash = hashFragment ? `#${hashFragment}` : "";
        const isActive =
          pathname === baseHref && (itemHash ? hash === itemHash : !hash);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-3 py-1 transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}