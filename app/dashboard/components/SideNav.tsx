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

export const SideBar = ({
	className,
	onNavigate,
}: {
	className?: string;
	onNavigate?: () => void;
}) => {
	return (
		<div className={className}>
			<div
				className={cn(
					"flex size-full flex-col space-y-5 rounded-2xl border border-border/60 bg-background/85 p-6 shadow-2xl backdrop-blur-xl lg:w-96 lg:p-10 [&_a]:min-h-11 [&_a]:px-3 [&_a]:py-2 [&_a]:text-base"
				)}
			>
				<div className="flex-1 space-y-5">
					<div className="flex flex-1 items-center gap-2">
                                        <div>
                                                <h1 className="text-3xl font-semibold">Roomsily</h1>
                                                <p className="text-sm text-muted-foreground">www.roomsily household hub</p>
                                        </div>

						<ThemeToggle />
					</div>
					<NavLinks onNavigate={onNavigate} />
				</div>
				<div className="">
					<SignOut />
				</div>
			</div>
		</div>
	);
};
