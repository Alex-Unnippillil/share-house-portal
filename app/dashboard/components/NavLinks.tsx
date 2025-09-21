"use client";
import React, { useEffect, useState } from "react";
import {
  ChatBubbleIcon,
  CrumpledPaperIcon,
  LightningBoltIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import useSupabaseBrowser from "@/utils/supabase-browser";
import { isStaffRole } from "@/app/(tenant)/message-board/roles";

export default function NavLinks() {
        const pathname = usePathname();

        const supabase = useSupabaseBrowser();
        const [isStaff, setIsStaff] = useState(false);

        useEffect(() => {
                let active = true;

                const loadRole = async () => {
                        const {
                                data: { user },
                        } = await supabase.auth.getUser();

                        if (!user) {
                                return;
                        }

                        const { data } = await supabase
                                .from("profiles")
                                .select("role")
                                .eq("id", user.id)
                                .single();

                        if (!active) {
                                return;
                        }

                        setIsStaff(isStaffRole(data?.role ?? null));
                };

                void loadRole();

                return () => {
                        active = false;
                };
        }, [supabase]);

        const links = [
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
                        href: "/message-board",
                        text: "Message Board",
                        Icon: ChatBubbleIcon,
                },
        ];

        if (isStaff) {
                links.push({
                        href: "/dashboard/message-board/moderation",
                        text: "Moderation",
                        Icon: LightningBoltIcon,
                });
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