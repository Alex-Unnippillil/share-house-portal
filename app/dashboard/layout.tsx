import { Suspense, type ReactNode } from "react"

import { redirect } from "next/navigation"

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"
import { QuickAddInput } from "@/components/quick-add/quick-add-input"
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
		<div className="flex w-full ">
			<div className="flex h-screen flex-col">
				<SideNav />
				<MobileSideNav />
			</div>

                        <div className="w-full space-y-5 bg-gray-100 p-5 sm:flex-1 sm:p-10 dark:bg-inherit">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <ToggleSidebar />
                                        <QuickAddInput
                                                variant="header"
                                                className="w-full lg:max-w-xl"
                                                placeholder="Quick add — e.g. “Invoice 200 CAD due Friday”"
                                        />
                                </div>
                                <ErrorBoundary>
                                        <Suspense fallback={<RouteSkeleton />}>
                                                {children}
                                        </Suspense>
                                </ErrorBoundary>
                        </div>
                </div>
        );
}
