import { Suspense, type ReactNode } from "react"

import { redirect } from "next/navigation"

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import FirstRunTour from "@/components/onboarding/FirstRunTour"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"
import { readUserSession } from "@/utils/actions"
import { createSupbaseServerClient } from "@/utils/supaone"
import MobileSideNav from "./components/MobileSideNav"
import SideNav from "./components/SideNav"
import ToggleSidebar from "./components/ToggleSidebar"

export default async function Layout({ children }: { children: ReactNode }) {
	const { data: userSession } = await readUserSession();

	if (!userSession.session) {
		return redirect("/auth");
	}
        let initialHasSeenTour = false;

        try {
                const supabase = await createSupbaseServerClient();
                const { data, error } = await supabase
                        .from("profiles")
                        .select("has_seen_tour")
                        .eq("id", userSession.session.user.id)
                        .maybeSingle();

                if (error && error.code !== "PGRST116") {
                        console.error("Unable to resolve dashboard tour preference", error);
                }

                initialHasSeenTour = data?.has_seen_tour ?? false;
        } catch (profileError) {
                console.error("Failed to load dashboard tour state", profileError);
        }

        return (
                <FirstRunTour initialHasSeenTour={initialHasSeenTour}>
                        <div className="flex w-full">
                                <div className="flex h-screen flex-col">
                                        <SideNav />
                                        <MobileSideNav />
                                </div>

                                <div
                                        className="w-full space-y-5 bg-gray-100 p-5 sm:flex-1 sm:p-10 dark:bg-inherit"
                                        data-tour-id="dashboard-workspace"
                                >
                                        <ToggleSidebar />
                                        <ErrorBoundary>
                                                <Suspense fallback={<RouteSkeleton />}>
                                                        {children}
                                                </Suspense>
                                        </ErrorBoundary>
                                </div>
                        </div>
                </FirstRunTour>
        );
}
