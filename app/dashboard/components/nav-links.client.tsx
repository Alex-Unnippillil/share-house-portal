"use client";
import React, { useEffect, useState } from "react";
import { PersonIcon, CrumpledPaperIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase-browser";

export default function NavLinksClient() {
        const pathname = usePathname();
        const [role, setRole] = useState<string | null>(null);
        const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
                const supabase = createClient();
                let isMounted = true;

                const load = async () => {
                        try {
                                const {
                                        data: { user },
                                } = await supabase.auth.getUser();

                                if (!user) {
                                        if (isMounted) {
                                                setRole(null);
                                        }
                                        return;
                                }

                                const { data: profile } = await supabase
                                        .from('profiles')
                                        .select('role')
                                        .eq('id', user.id)
                                        .single();

                                if (isMounted) {
                                        setRole(profile?.role || null);
                                }
                        } catch (error) {
                                if (isMounted) {
                                        setRole(null);
                                }
                        } finally {
                                if (isMounted) {
                                        setIsLoading(false);
                                }
                        }
                };

                void load();

                return () => {
                        isMounted = false;
                };
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

        if (isLoading) {
                return (
                        <div className="space-y-3">
                                {Array.from({ length: 5 }).map((_, index) => (
                                        <div
                                                // eslint-disable-next-line react/no-array-index-key
                                                key={index}
                                                className="h-8 animate-pulse rounded-sm bg-muted"
                                        />
                                ))}
                        </div>
                );
        }

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