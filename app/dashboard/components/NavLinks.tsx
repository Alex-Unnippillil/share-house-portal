"use client";
import React, { useCallback, useEffect, useState } from "react";
import { PersonIcon, CrumpledPaperIcon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import SmartLink from "@/components/navigation/SmartLink";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase-browser";
import { fetchMemberRole } from "@/lib/data/members";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";
import { useFirstRunTourContext } from "@/components/onboarding/FirstRunTour";

export default function NavLinks() {
        const pathname = usePathname();
        const [role, setRole] = useState<string | null>(null);
        const { replayTour, isPending: tourPending, isTourActive } = useFirstRunTourContext();

	useEffect(() => {
		const load = async () => {
			try {
				const supabase = createClient();
                                const { data: { user } } = await supabase.auth.getUser();
                                if (!user) {
                                        setRole(null);
                                        return;
                                }
                                const typedSupabase = supabase as unknown as TypedSupabaseClient;
                                try {
                                        const resolvedRole = await fetchMemberRole(typedSupabase, user.id);
                                        setRole(resolvedRole || null);
                                } catch (memberError) {
                                        console.error("Error loading member role", memberError);
                                        setRole(null);
                                }
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

        const handleReplayTour = useCallback(() => {
                replayTour();
                document.getElementById("sidebar-close")?.click();
        }, [replayTour]);

        return (
                <div className="space-y-5">
                        {links.map((link, index) => {
                                const Icon = link.Icon;
                                return (
                                        <SmartLink
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
                                                intent="navigation"
                                        >
                                                <Icon />
                                                {link.text}
                                        </SmartLink>
                                        );
                        })}
                        <button
                                type="button"
                                onClick={handleReplayTour}
                                className={cn(
                                        "flex w-full items-center gap-2 rounded-sm p-2 text-left transition hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-gray-700",
                                        {
                                                "bg-gray-500 text-white dark:bg-gray-700": isTourActive,
                                        },
                                )}
                                data-tour-id="dashboard-help"
                                disabled={tourPending || isTourActive}
                        >
                                <QuestionMarkCircledIcon />
                                Product tour
                        </button>
                </div>
        );
}
