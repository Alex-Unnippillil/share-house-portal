"use client";
import React, { useEffect, useState } from "react";
import { PersonIcon, CrumpledPaperIcon } from "@radix-ui/react-icons";
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
		];

	return (
		<div className="space-y-5">
			{links.map((link, index) => {
				const Icon = link.Icon;
				return (
                                        <Link
                                                onClick={() =>
                                                        document.getElementById("sidebar-close")?.click()
                                                }
                                                href={link.href}
                                                prefetch={false}
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