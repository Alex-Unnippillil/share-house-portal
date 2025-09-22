"use client";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import { useSidebarToggle } from "@/lib/hooks/use-sidebar";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";

function ToggleSidebar() {
        const toggleSidebar = useSidebarToggle();

        return (
                <Button
                        type="button"
                        variant="outline"
                        className="block lg:hidden"
                        onClick={toggleSidebar}
                >
                        <HamburgerMenuIcon />
                </Button>
        );
}

export default memo(ToggleSidebar);
