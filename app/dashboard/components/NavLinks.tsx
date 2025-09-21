"use client";
import React from "react";
import { BarChart2, ClipboardCheck, Home, Users, Wrench } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";

const baseLinks = [
        { href: "/dashboard", text: "Overview", Icon: Home },
        { href: "/dashboard/maintenance", text: "Maintenance", Icon: Wrench },
        { href: "/dashboard/visitors", text: "Visitors", Icon: Users },
        { href: "/dashboard/documents", text: "Documents", Icon: ClipboardCheck },
        { href: "/dashboard/analytics", text: "Analytics", Icon: BarChart2 },
];

export default function NavLinks() {
        const pathname = usePathname();
        const searchParams = useSearchParams();
        const building = searchParams.get("building");

        const links = baseLinks.map((link) => ({
                ...link,
                href: building ? `${link.href}?building=${building}` : link.href,
        }));

        return (
                <div className="space-y-5">
                        {links.map((link, index) => {
                                const Icon = link.Icon;
                                const baseHref = link.href.split("?")[0];
                                const active = pathname === baseHref;
                                return (
                                        <Link
                                                onClick={() =>
                                                        document.getElementById("sidebar-close")?.click()
                                                }
                                                href={link.href}
                                                key={link.href}
                                                className={cn(
                                                        "flex items-center gap-2 rounded-sm p-2 text-sm font-medium transition-colors",
                                                        active
                                                                ? "bg-gray-900 text-white dark:bg-gray-700"
                                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
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