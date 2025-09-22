"use client";

import { useEffect } from "react";

import { useSidebarOpen, useSidebarSetOpen } from "@/lib/hooks/use-sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SideBar } from "./SideNav";

export default function MobileSideNav() {
        const isOpen = useSidebarOpen();
        const setOpen = useSidebarSetOpen();

        useEffect(() => {
                const handleResize = () => {
                        if (window.innerWidth >= 1024) {
                                setOpen(false);
                        }
                };

                handleResize();
                window.addEventListener("resize", handleResize);
                return () => {
                        window.removeEventListener("resize", handleResize);
                };
        }, [setOpen]);

        return (
                <Sheet open={isOpen} onOpenChange={setOpen}>
                        <SheetContent side={"left"} className="dark:bg-gradient-dark flex">
                                <SideBar />
                        </SheetContent>
                </Sheet>
        );
}
