import React from "react";
import NavLinks from "./NavLinks";

import { cn } from "@/lib/utils";
import SignOut from "./SignOut";
import { ThemeToggle } from "@/components/theme-toggle"
export default function SideNav() {
	return (
		<SideBar className=" dark:bg-gradient-dark hidden flex-1 lg:block" />
	);
}

export const SideBar = ({ className }: { className?: string }) => {
        return (
                <div className={className}>
                        <div
                                className={cn(
                                        "flex size-full flex-col space-y-5 lg:w-96 lg:border-r lg:p-10 "
                                )}
                                data-tour-id="dashboard-navigation"
                        >
                                <div className="flex-1 space-y-5">
                                        <div className="flex flex-1 items-center gap-2">
                                        <div>
                                                <h1 className="text-3xl font-semibold">Roomsily</h1>
                                                <p className="text-sm text-muted-foreground">www.roomsily household hub</p>
                                        </div>

						<ThemeToggle />
					</div>
					<NavLinks />
				</div>
				<div className="">
					<SignOut />
				</div>
			</div>
		</div>
	);
};