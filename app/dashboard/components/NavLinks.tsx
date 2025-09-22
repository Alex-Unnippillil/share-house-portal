"use client";
import React, { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase-browser";

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

	const isLandlord = role === 'property_manager' || role === 'admin' || role === 'landlord';

        const links = isLandlord
                ? [
                        { href: "/dashboard/members", text: "Members", icon: "user" as const },
                        { href: "/payments", text: "Payments", icon: "file-text" as const },
                        { href: "/documents", text: "Documents", icon: "file-text" as const },
                        { href: "/messaging", text: "Message Board", icon: "message-square" as const },
                ]
                : [
                        { href: "/payments", text: "Payments", icon: "file-text" as const },
                        { href: "/documents", text: "My Lease", icon: "file-text" as const },
                        { href: "/messaging", text: "Message Board", icon: "message-square" as const },
                        { href: "/chores", text: "Chores", icon: "sparkles" as const },
                        { href: "/supplies", text: "Supplies", icon: "wallet" as const },
                ];

	return (
		<div className="space-y-5">
			{links.map((link, index) => {
                                return (
                                        <Link
						onClick={() =>
							document.getElementById("sidebar-close")?.click()
						}
						href={link.href}
						key={index}
						className={cn(
							"flex items-center gap-2 rounded-sm p-2",
							{
								" bg-gray-500 dark:bg-gray-700 text-white ":
									pathname === link.href,
							}
						)}
					>
                                                <Icon name={link.icon} aria-hidden />
						{link.text}
					</Link>
				);
			})}
		</div>
	);
}