"use client";
import React, { useCallback, useEffect, useState } from "react";
import { PersonIcon, CrumpledPaperIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase-browser";

type DashboardLink = {
        id: string;
        href: string;
        text: string;
        Icon: typeof PersonIcon;
};

const LANDLORD_LINKS: DashboardLink[] = [
        { id: "members", href: "/dashboard/members", text: "Members", Icon: PersonIcon },
        { id: "payments", href: "/payments", text: "Payments", Icon: CrumpledPaperIcon },
        { id: "documents", href: "/documents", text: "Documents", Icon: CrumpledPaperIcon },
        { id: "messaging", href: "/messaging", text: "Message Board", Icon: CrumpledPaperIcon },
];

const TENANT_LINKS: DashboardLink[] = [
        { id: "payments", href: "/payments", text: "Payments", Icon: CrumpledPaperIcon },
        { id: "documents", href: "/documents", text: "My Lease", Icon: CrumpledPaperIcon },
        { id: "messaging", href: "/messaging", text: "Message Board", Icon: CrumpledPaperIcon },
        { id: "chores", href: "/chores", text: "Chores", Icon: CrumpledPaperIcon },
        { id: "supplies", href: "/supplies", text: "Supplies", Icon: CrumpledPaperIcon },
];

export default function NavLinks() {
	const pathname = usePathname();
	const [role, setRole] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				const supabase = createClient();
				const { data: { user } } = await supabase.auth.getUser();
				if (!user) {
					setRole(null);
					return;
				}
				const { data: profile } = await supabase
					.from('profiles')
					.select('role')
					.eq('id', user.id)
					.single();
				setRole(profile?.role || null);
			} catch (e) {
				setRole(null);
			}
		};
		load();
	}, []);

        const isLandlord =
                role === "property_manager" || role === "admin" || role === "landlord";
        const links = isLandlord ? LANDLORD_LINKS : TENANT_LINKS;
        const handleSidebarClose = useCallback(() => {
                document.getElementById("sidebar-close")?.click();
        }, []);

	return (
		<div className="space-y-5">
                        {links.map((link) => {
                                const Icon = link.Icon;
                                return (
                                        <Link
                                                onClick={handleSidebarClose}
                                                href={link.href}
                                                key={link.id}
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