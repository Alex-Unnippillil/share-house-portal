import { Suspense, type ReactNode } from "react"

import { redirect } from "next/navigation"

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"
import { readUserSession } from "@/utils/actions"
import MobileSideNav from "./components/MobileSideNav"
import SideNav from "./components/SideNav"
import ToggleSidebar from "./components/ToggleSidebar"

export default async function Layout({ children }: { children: ReactNode }) {
	const { data: userSession } = await readUserSession();

	if (!userSession.session) {
		return redirect("/auth");
	}
	return (
		<div className="flex min-h-screen w-full bg-background">
			<div className="flex min-h-screen flex-col bg-muted/20">
				<SideNav />
				<MobileSideNav />
			</div>

			<main className="flex min-w-0 flex-1 flex-col gap-section bg-muted/30 p-content-gutter py-6 lg:py-8">
				<ToggleSidebar />
				<ErrorBoundary>
					<Suspense fallback={<RouteSkeleton />}>
						{children}
					</Suspense>
				</ErrorBoundary>
			</main>
		</div>
	);
}
