"use client";

import { useEffect, useMemo } from "react";

import { useFirstRunTourContext } from "@/components/onboarding/FirstRunTour";
import { Button } from "@/components/ui/button";

export default function TourPreviewScaffold() {
        const { replayTour, isPending, isTourActive } = useFirstRunTourContext();

        const previousOverrides = useMemo(() => {
                if (typeof window === "undefined") {
                        return { overrides: undefined, log: undefined } as const;
                }

                const overrides = window.__dashboardTourOverrides;
                const log = window.__tourCallLog;

                window.__tourCallLog = [];
                window.__dashboardTourOverrides = {
                        getStatus: async () => {
                                window.__tourCallLog?.push?.("status");
                                return { hasSeenTour: false };
                        },
                        markComplete: async () => {
                                window.__tourCallLog?.push?.("complete");
                                return { hasSeenTour: true };
                        },
                        replay: async () => {
                                window.__tourCallLog?.push?.("replay");
                                return { hasSeenTour: false };
                        },
                };

                return { overrides, log } as const;
        }, []);

        useEffect(() => {
                return () => {
                        if (typeof window === "undefined") {
                                return;
                        }

                        if (previousOverrides.overrides) {
                                window.__dashboardTourOverrides = previousOverrides.overrides;
                        } else {
                                delete window.__dashboardTourOverrides;
                        }

                        if (previousOverrides.log) {
                                window.__tourCallLog = previousOverrides.log;
                        } else {
                                delete window.__tourCallLog;
                        }
                };
        }, [previousOverrides]);

        return (
                <div className="flex min-h-screen flex-col bg-slate-950 text-white">
                        <div className="flex flex-1 flex-col lg:flex-row">
                                <aside
                                        data-tour-id="dashboard-navigation"
                                        className="w-full max-w-xs space-y-4 border-b border-slate-800 bg-slate-900 p-6 lg:h-screen lg:border-b-0 lg:border-r"
                                >
                                        <div>
                                                <h1 className="text-2xl font-semibold">Dashboard tour sandbox</h1>
                                                <p className="mt-2 text-sm text-slate-300">
                                                        Use this page to validate the first-run experience without signing in.
                                                </p>
                                        </div>
                                        <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={replayTour}
                                                data-tour-id="dashboard-help"
                                                disabled={isPending || isTourActive}
                                        >
                                                Product tour
                                        </Button>
                                </aside>
                                <main className="flex flex-1 flex-col gap-6 bg-white p-6 text-slate-900 dark:bg-slate-950 dark:text-white">
                                        <div
                                                data-tour-id="dashboard-mobile-trigger"
                                                className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 p-4 dark:border-slate-700"
                                        >
                                                <span className="text-sm text-muted-foreground">
                                                        Mobile menu toggle placeholder
                                                </span>
                                                <Button variant="outline" type="button">
                                                        Menu
                                                </Button>
                                        </div>
                                        <section
                                                data-tour-id="dashboard-workspace"
                                                className="min-h-[320px] rounded-lg border border-dashed border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                                        >
                                                <h2 className="text-xl font-semibold">Workspace canvas</h2>
                                                <p className="mt-2 text-muted-foreground">
                                                        Drop dashboard widgets here to ensure the highlight overlay aligns with your
                                                        layout.
                                                </p>
                                        </section>
                                </main>
                        </div>
                </div>
        );
}
