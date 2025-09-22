import React from "react";
import NavLinks from "./NavLinks";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
			>
				<div className="flex-1 space-y-5">
					<div className="flex flex-1 items-center gap-2">
						<h1 className="text-3xl font-bold">Onyx Dash</h1>

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