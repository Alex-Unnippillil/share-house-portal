"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PersonIcon, CrumpledPaperIcon } from "@radix-ui/react-icons";
import { Layers, Wrench } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import useSupabaseBrowser from "@/utils/supabase-browser";
import { usePathname } from "next/navigation";

const STAFF_ROLES = new Set(["admin", "property_manager", "staff"]);

type NavigationLink = {
        href: string;
        text: string;
        Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const baseLinks: NavigationLink[] = [
        {
                href: "/dashboard/members",
                text: "Members",
                Icon: PersonIcon,
        },
        {
                href: "/dashboard/todo",
                text: "Todo",
                Icon: CrumpledPaperIcon,
        },
        {
                href: "/dashboard/floorplan",
                text: "Floorplan",
                Icon: Layers,
        },
];

const staffLinks: NavigationLink[] = [
        {
                href: "/dashboard/floorplan/manage",
                text: "Manage Floorplans",
                Icon: Wrench,
        },
];

export default function NavLinks() {
        const pathname = usePathname();
        const supabase = useSupabaseBrowser();
        const [role, setRole] = useState<string | null>(null);

        useEffect(() => {
                let active = true;
                const loadRole = async () => {
                        const { data: userData } = await supabase.auth.getUser();
                        const userId = userData.user?.id;

                        if (!userId) {
                                if (active) setRole(null);
                                return;
                        }

                        const { data: profile } = await supabase
                                .from("profiles")
                                .select("role")
                                .eq("id", userId)
                                .maybeSingle();

                        if (active) {
                                setRole(profile?.role ?? null);
                        }
                };

                loadRole();

                return () => {
                        active = false;
                };
        }, [supabase]);

        const links = useMemo(() => {
                if (role && STAFF_ROLES.has(role)) {
                        return [...baseLinks, ...staffLinks];
                }
                return baseLinks;
        }, [role]);

        return (
                <div className="space-y-5">
                        {links.map((link) => {
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
                                                                " bg-gray-500 dark:bg-gray-700 text-white ":
                                                                        pathname === link.href,
                                                        }
                                                )}
                                        >
                                                <Icon className="size-4" />
                                                {link.text}
                                        </Link>
                                );
                        })}
                </div>
        );
}