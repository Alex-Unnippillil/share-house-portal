"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const segments = [
        { href: "/dashboard", label: "Overview", prefetch: true },
        { href: "/dashboard/analytics", label: "Analytics", prefetch: false },
        { href: "/dashboard/activity", label: "Activity", prefetch: false },
];

export function DashboardNav() {
        const pathname = usePathname();

        return (
                <nav className="flex flex-wrap items-center gap-2">
                        {segments.map((segment) => {
                                const isActive = pathname === segment.href || pathname.startsWith(`${segment.href}/`);

                                return (
                                        <Link
                                                key={segment.href}
                                                href={segment.href}
                                                prefetch={segment.prefetch}
                                                className={cn(
                                                        "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                                                        isActive
                                                                ? "border-primary bg-primary text-primary-foreground"
                                                                : "border-transparent bg-muted text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                                                )}
                                                aria-current={isActive ? "page" : undefined}
                                        >
                                                {segment.label}
                                        </Link>
                                );
                        })}
                </nav>
        );
}
