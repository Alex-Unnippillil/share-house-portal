"use client";

import { useEffect, useState } from "react";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { usePathname } from "next/navigation";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { SideBar } from "./SideNav";

export default function MobileSideNav() {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	useEffect(() => {
		const handleWindowResize = () => {
			if (window.innerWidth >= 1024) {
				setOpen(false);
			}
		};

		window.addEventListener("resize", handleWindowResize);
		return () => {
			window.removeEventListener("resize", handleWindowResize);
		};
	}, []);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<button
					type="button"
					aria-label="Open navigation menu"
					aria-haspopup="dialog"
					aria-expanded={open}
					className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
				>
					<HamburgerMenuIcon className="size-5" aria-hidden="true" />
				</button>
			</SheetTrigger>
			<SheetContent side="left" className="dark:bg-gradient-dark flex">
				<SideBar onNavigate={() => setOpen(false)} />
			</SheetContent>
		</Sheet>
	);
}
