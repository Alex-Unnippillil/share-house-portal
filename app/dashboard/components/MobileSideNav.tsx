"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

import { SideBar } from "./SideNav";
import {
        MOBILE_NAV_ITEMS,
        MOBILE_TOUCH_TARGET_CLASSNAMES,
        MOBILE_TOUCH_TARGET_MIN_HEIGHT,
} from "./mobile-nav.config";

const BOTTOM_NAV_WRAPPER_CLASSES =
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] " +
        "supports-[backdrop-filter]:bg-background/60 lg:hidden";

const BOTTOM_NAV_CONTENT_CLASSES = "mx-auto flex max-w-xl items-stretch gap-1 px-2 py-2";

export default function MobileSideNav() {
        useEffect(() => {
                const handleResize = () => {
                        if (window.innerWidth >= 1024) {
                                document.getElementById("sidebar-close")?.click();
                        }
                };

                window.addEventListener("resize", handleResize);
                return () => {
                        window.removeEventListener("resize", handleResize);
                };
        }, []);

        const pathname = usePathname();

        return (
                <Sheet>
                        <nav aria-label="Primary" className={BOTTOM_NAV_WRAPPER_CLASSES}>
                                <div className={BOTTOM_NAV_CONTENT_CLASSES}>
                                        {MOBILE_NAV_ITEMS.map((item) => {
                                                const isActive =
                                                        pathname === item.href ||
                                                        pathname.startsWith(`${item.href}/`);

                                                return (
                                                        <Button
                                                                aria-current={isActive ? "page" : undefined}
                                                                aria-label={item.label}
                                                                asChild
                                                                className={cn(
                                                                        MOBILE_TOUCH_TARGET_CLASSNAMES,
                                                                        "flex-1 flex-col gap-1 px-2 text-xs font-medium",
                                                                        isActive
                                                                                ? "shadow-sm"
                                                                                : "text-muted-foreground"
                                                                )}
                                                                key={item.href}
                                                                style={{ minHeight: MOBILE_TOUCH_TARGET_MIN_HEIGHT }}
                                                                variant={isActive ? "default" : "ghost"}
                                                        >
                                                                <Link href={item.href}>
                                                                        <item.icon aria-hidden="true" className="size-5" />
                                                                        <span>{item.label}</span>
                                                                </Link>
                                                        </Button>
                                                );
                                        })}

                                        <SheetTrigger asChild>
                                                <Button
                                                        aria-label="Open overflow menu"
                                                        className={cn(
                                                                MOBILE_TOUCH_TARGET_CLASSNAMES,
                                                                "flex-1 flex-col gap-1 px-2 text-xs font-medium text-muted-foreground"
                                                        )}
                                                        style={{ minHeight: MOBILE_TOUCH_TARGET_MIN_HEIGHT }}
                                                        variant="ghost"
                                                >
                                                        <Menu aria-hidden="true" className="size-5" />
                                                        <span>More</span>
                                                </Button>
                                        </SheetTrigger>
                                </div>
                        </nav>
                        <SheetContent
                                className="dark:bg-gradient-dark flex max-w-sm flex-1 overflow-y-auto lg:hidden"
                                side="left"
                        >
                                <SideBar />
                        </SheetContent>
                </Sheet>
        );
}
