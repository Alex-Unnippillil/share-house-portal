"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useMemo, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
        LayoutDashboard,
        CalendarRange,
        Users2,
        ListChecks,
        PanelsTopLeft,
        UserCheck2,
        FileSignature,
        Map,
        Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { AppRole, NavigationIconKey } from "@/config/rbac";
import { getNavGroupsForRole } from "@/config/rbac";

type NavLinksProps = {
        role: AppRole;
        onNavigate?: () => void;
};

const ICONS: Record<NavigationIconKey, ComponentType<{ className?: string }>> = {
        dashboard: LayoutDashboard,
        members: Users2,
        todos: ListChecks,
        amenities: PanelsTopLeft,
        bookings: CalendarRange,
        visitors: UserCheck2,
        leases: FileSignature,
        floorplans: Map,
        payments: Wallet,
};

export default function NavLinks({ role, onNavigate }: NavLinksProps) {
        const pathname = usePathname();
        const [activeHash, setActiveHash] = useState<string>("");

        useEffect(() => {
                const updateHash = () => {
                        setActiveHash(window.location.hash);
                };
                updateHash();
                window.addEventListener("hashchange", updateHash);
                return () => window.removeEventListener("hashchange", updateHash);
        }, []);

        const navGroups = useMemo(() => getNavGroupsForRole(role), [role]);

        return (
                <div className="space-y-6">
                        {navGroups.map((group) => (
                                <div key={group.title} className="space-y-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                {group.title}
                                        </p>
                                        <div className="space-y-2">
                                                {group.items.map((item) => {
                                                        const Icon = ICONS[item.icon];
                                                        const [baseHref, hash] = item.href.split("#");
                                                        const itemHash = hash ? `#${hash}` : "";
                                                        const isHashTarget = Boolean(itemHash);
                                                        const isActive =
                                                                pathname === baseHref &&
                                                                (isHashTarget ? activeHash === itemHash : true);

                                                        return (
                                                                <Link
                                                                        key={item.href}
                                                                        href={item.href}
                                                                        onClick={() => {
                                                                                if (isHashTarget) {
                                                                                        setActiveHash(itemHash);
                                                                                }
                                                                                document
                                                                                        .getElementById("sidebar-close")
                                                                                        ?.click();
                                                                                onNavigate?.();
                                                                        }}
                                                                        className={cn(
                                                                                "group flex items-start gap-3 rounded-md border border-transparent p-3 transition-colors hover:border-muted hover:bg-muted/40",
                                                                                {
                                                                                        "border-primary/60 bg-primary/10 text-primary":
                                                                                                isActive,
                                                                                }
                                                                        )}
                                                                >
                                                                        <span className="mt-0.5">
                                                                                <Icon className="size-4" />
                                                                        </span>
                                                                        <span className="flex flex-col">
                                                                                <span className="text-sm font-medium leading-none">
                                                                                        {item.label}
                                                                                </span>
                                                                                {item.description ? (
                                                                                        <span className="text-xs text-muted-foreground">
                                                                                                {item.description}
                                                                                        </span>
                                                                                ) : null}
                                                                        </span>
                                                                </Link>
                                                        );
                                                })}
                                        </div>
                                </div>
                        ))}
                </div>
        );
}