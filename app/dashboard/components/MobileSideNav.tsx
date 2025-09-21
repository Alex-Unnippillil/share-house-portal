"use client";

import { useEffect, useState } from "react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { AppRole } from "@/config/rbac";
import { SidebarShell } from "./sidebar-shell";

type MobileSideNavProps = {
        role: AppRole;
};

export default function MobileSideNav({ role }: MobileSideNavProps) {
        const [open, setOpen] = useState(false);

        useEffect(() => {
                const handler = (event: UIEvent) => {
                        const w = event.target as Window;
                        if (w.innerWidth >= 1024) {
                                setOpen(false);
                                document.getElementById("sidebar-close")?.click();
                        }
                };
                window.addEventListener("resize", handler);
                return () => {
                        window.removeEventListener("resize", handler);
                };
        }, []);

        return (
                <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild id="toggle-sidebar">
                                <span></span>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex max-w-xs p-0">
                                <SidebarShell
                                        role={role}
                                        className="size-full bg-background dark:bg-gradient-dark"
                                        onNavigate={() => setOpen(false)}
                                />
                        </SheetContent>
                </Sheet>
        );
}