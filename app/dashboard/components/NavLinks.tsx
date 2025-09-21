"use client";
import React from "react";
import {
        BarChartIcon,
        FileTextIcon,
        HomeIcon,
        MixerHorizontalIcon,
        PersonIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavLinks() {
        const pathname = usePathname();
        const searchParams = useSearchParams();
        const buildingId = searchParams.get("building");
        const querySuffix = buildingId ? `?building=${buildingId}` : "";

        const links = [
                {
                        href: "/dashboard",
                        text: "Overview",
                        Icon: HomeIcon,
                },
                {
                        href: "/dashboard/maintenance",
                        text: "Maintenance",
                        Icon: MixerHorizontalIcon,
                },
                {
                        href: "/dashboard/visitors",
                        text: "Visitors",
                        Icon: PersonIcon,
                },
                {
                        href: "/dashboard/documents",
                        text: "Documents",
                        Icon: FileTextIcon,
                },
                {
                        href: "/dashboard/analytics",
                        text: "Analytics",
                        Icon: BarChartIcon,
                },
        ];

        return (
                <div className="space-y-5">
                        {links.map((link, index) => {
                                const Icon = link.Icon;
                                const href = `${link.href}${querySuffix}`;
                                return (
                                        <Link
                                                onClick={() =>
                                                        document.getElementById("sidebar-close")?.click()
                                                }
                                                href={href}
                                                key={index}
                                                className={cn(
                                                        "flex items-center gap-2 rounded-sm p-2",
                                                        {
                                                                " bg-gray-500 dark:bg-gray-700 text-white ":
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