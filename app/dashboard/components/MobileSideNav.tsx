"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SideBar } from "./SideNav";
import { useEffect } from "react";
import { useThrottledCallback } from "@/hooks/useThrottledCallback";

export default function MobileSideNav() {
        const closeSidebarOnDesktop = useThrottledCallback(() => {
                if (typeof window === "undefined") {
                        return;
                }
                if (window.innerWidth >= 1024) {
                        document.getElementById("sidebar-close")?.click();
                }
        }, 150);

        useEffect(() => {
                closeSidebarOnDesktop();
                window.addEventListener("resize", closeSidebarOnDesktop);
                return () => {
                        window.removeEventListener("resize", closeSidebarOnDesktop);
                };
        }, [closeSidebarOnDesktop]);

        return (
                <Sheet>
                        <SheetTrigger asChild id="toggle-sidebar">
                                <span></span>
			</SheetTrigger>
			<SheetContent side={"left"} className="dark:bg-gradient-dark flex">
				<SideBar />
			</SheetContent>
		</Sheet>
	);
}