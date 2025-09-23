"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
        completeTour,
        getTourStatus,
        requestTourReplay,
} from "@/app/dashboard/actions/tour";
import { useToast } from "@/components/ui/use-toast";

type TourStatus = {
        hasSeenTour: boolean;
};

type TourAction = () => Promise<TourStatus>;

type TourActionOverrides = {
        getStatus?: TourAction;
        markComplete?: TourAction;
        replay?: TourAction;
};

declare global {
        interface Window {
                __dashboardTourOverrides?: TourActionOverrides;
                __tourCallLog?: string[];
        }
}

function resolveActions(): {
        getStatus: TourAction;
        markComplete: TourAction;
        replay: TourAction;
} {
        if (typeof window !== "undefined") {
                const overrides = window.__dashboardTourOverrides;

                if (overrides) {
                        return {
                                getStatus: overrides.getStatus ?? getTourStatus,
                                markComplete: overrides.markComplete ?? completeTour,
                                replay: overrides.replay ?? requestTourReplay,
                        };
                }
        }

        return {
                getStatus: getTourStatus,
                markComplete: completeTour,
                replay: requestTourReplay,
        };
}

type DashboardTourState = {
        hasSeenTour: boolean;
        isOpen: boolean;
        isLoading: boolean;
        isPending: boolean;
        currentStep: number;
        goToNext: () => void;
        goToPrevious: () => void;
        skipTour: () => void;
        handleOpenChange: (nextOpen: boolean) => void;
        replayTour: () => void;
};

export function useDashboardTour(initialHasSeenTour: boolean | undefined, totalSteps: number): DashboardTourState {
        const { toast } = useToast();
        const [hasSeenTour, setHasSeenTour] = useState(initialHasSeenTour ?? false);
        const [isOpen, setIsOpen] = useState(!(initialHasSeenTour ?? false));
        const [currentStep, setCurrentStep] = useState(0);
        const [isLoading, setIsLoading] = useState(true);
        const [isPending, startTransition] = useTransition();
        const isFinalizingRef = useRef(false);

        useEffect(() => {
                setHasSeenTour(initialHasSeenTour ?? false);
                setIsOpen(!(initialHasSeenTour ?? false));
        }, [initialHasSeenTour]);

        useEffect(() => {
                let active = true;

                const fetchStatus = async () => {
                        try {
                                const { getStatus } = resolveActions();
                                const status = await getStatus();

                                if (!active) {
                                        return;
                                }

                                setHasSeenTour(status.hasSeenTour);
                                setIsOpen(!status.hasSeenTour);
                        } catch (error) {
                                if (!active) {
                                        return;
                                }

                                console.error("Failed to load dashboard tour status", error);
                                setHasSeenTour(true);
                                setIsOpen(false);
                        } finally {
                                if (active) {
                                        setIsLoading(false);
                                }
                        }
                };

                fetchStatus();

                return () => {
                        active = false;
                };
        }, []);

        const finalizeTour = useCallback(() => {
                if (isFinalizingRef.current) {
                        return;
                }

                isFinalizingRef.current = true;
                setIsOpen(false);
                setCurrentStep(0);

                startTransition(async () => {
                        try {
                                const { markComplete } = resolveActions();
                                const status = await markComplete();
                                setHasSeenTour(status.hasSeenTour);
                        } catch (error) {
                                console.error("Unable to update tour completion", error);
                                toast({
                                        title: "We couldn't save your tour progress",
                                        description: "Please try again. Your dashboard is still available in the background.",
                                        variant: "destructive",
                                });
                        } finally {
                                isFinalizingRef.current = false;
                        }
                });
        }, [startTransition, toast]);

        const goToNext = useCallback(() => {
                setCurrentStep((previous) => {
                        if (previous >= totalSteps - 1) {
                                finalizeTour();
                                return previous;
                        }

                        return previous + 1;
                });
        }, [finalizeTour, totalSteps]);

        const goToPrevious = useCallback(() => {
                setCurrentStep((previous) => Math.max(previous - 1, 0));
        }, []);

        const skipTour = useCallback(() => {
                finalizeTour();
        }, [finalizeTour]);

        const handleOpenChange = useCallback(
                (nextOpen: boolean) => {
                        if (!nextOpen) {
                                finalizeTour();
                        }
                },
                [finalizeTour],
        );

        const replayTour = useCallback(() => {
                setCurrentStep(0);
                setHasSeenTour(false);
                setIsOpen(true);

                startTransition(async () => {
                        try {
                                const { replay } = resolveActions();
                                const status = await replay();
                                setHasSeenTour(status.hasSeenTour);
                                if (status.hasSeenTour) {
                                        setIsOpen(false);
                                }
                        } catch (error) {
                                console.error("Unable to relaunch the dashboard tour", error);
                                setIsOpen(false);
                                toast({
                                        title: "We couldn't relaunch the tour",
                                        description: "Refresh and try again, or contact support if the issue continues.",
                                        variant: "destructive",
                                });
                        }
                });
        }, [startTransition, toast]);

        return useMemo(
                () => ({
                        hasSeenTour,
                        isOpen,
                        isLoading,
                        isPending,
                        currentStep,
                        goToNext,
                        goToPrevious,
                        skipTour,
                        handleOpenChange,
                        replayTour,
                }),
                [
                        currentStep,
                        goToNext,
                        goToPrevious,
                        handleOpenChange,
                        hasSeenTour,
                        isLoading,
                        isOpen,
                        isPending,
                        replayTour,
                        skipTour,
                ],
        );
}
