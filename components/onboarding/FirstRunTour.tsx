"use client";

import {
        createContext,
        useContext,
        useEffect,
        useMemo,
        useState,
} from "react";

import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import {
        Dialog,
        DialogContent,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useDashboardTour } from "@/hooks/use-first-run-tour";

type TourStep = {
        id: string;
        title: string;
        description: string;
        targetSelector?: string;
};

const DASHBOARD_TOUR_STEPS: TourStep[] = [
        {
                id: "navigation",
                title: "Household navigation",
                description:
                        "Use the sidebar to jump between members, rent, documents, chores, and shared messages.",
                targetSelector: '[data-tour-id="dashboard-navigation"]',
        },
        {
                id: "mobile-menu",
                title: "Mobile quick menu",
                description:
                        "On phones, open the dashboard menu from the toggle so you always have navigation within reach.",
                targetSelector: '[data-tour-id="dashboard-mobile-trigger"]',
        },
        {
                id: "workspace",
                title: "Workspace canvas",
                description:
                        "Review payments, booking activity, and roommates updates in the main workspace area.",
                targetSelector: '[data-tour-id="dashboard-workspace"]',
        },
        {
                id: "help",
                title: "Help & resources",
                description:
                        "Need a refresher later? Relaunch this walkthrough any time from the Help menu.",
                targetSelector: '[data-tour-id="dashboard-help"]',
        },
];

type HighlightRect = {
        top: number;
        left: number;
        width: number;
        height: number;
};

type FirstRunTourContextValue = {
        hasSeenTour: boolean;
        isTourActive: boolean;
        isLoading: boolean;
        isPending: boolean;
        replayTour: () => void;
};

const FirstRunTourContext = createContext<FirstRunTourContextValue | null>(null);

export function useFirstRunTourContext() {
        const context = useContext(FirstRunTourContext);

        if (!context) {
                throw new Error("useFirstRunTourContext must be used within a FirstRunTour provider");
        }

        return context;
}

type FirstRunTourProps = {
        children: React.ReactNode;
        initialHasSeenTour?: boolean;
};

export default function FirstRunTour({ children, initialHasSeenTour }: FirstRunTourProps) {
        const [isMounted, setIsMounted] = useState(false);
        const {
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
        } = useDashboardTour(initialHasSeenTour, DASHBOARD_TOUR_STEPS.length);

        useEffect(() => {
                setIsMounted(true);
        }, []);

        const activeStep = DASHBOARD_TOUR_STEPS[currentStep];
        const highlight = useHighlightRect(activeStep?.targetSelector, isOpen && isMounted);

        const contextValue = useMemo<FirstRunTourContextValue>(
                () => ({
                        hasSeenTour,
                        isTourActive: isOpen,
                        isLoading,
                        isPending,
                        replayTour,
                }),
                [hasSeenTour, isOpen, isLoading, isPending, replayTour],
        );

        return (
                <FirstRunTourContext.Provider value={contextValue}>
                        {children}
                        {isMounted && (
                                <>
                                        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                                                <DialogContent
                                                        data-testid="dashboard-first-run-tour"
                                                        className="max-w-xl space-y-4"
                                                >
                                                        <DialogHeader className="space-y-4 text-left">
                                                                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                                                                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                                                                                {currentStep + 1}
                                                                        </span>
                                                                        <span>
                                                                                Step {currentStep + 1} of {DASHBOARD_TOUR_STEPS.length}
                                                                        </span>
                                                                </div>
                                                                <DialogTitle className="text-xl font-semibold leading-tight">
                                                                        {activeStep?.title}
                                                                </DialogTitle>
                                                                <DialogDescription className="text-base text-muted-foreground">
                                                                        {activeStep?.description}
                                                                </DialogDescription>
                                                        </DialogHeader>

                                                        <nav
                                                                aria-label="Dashboard tour progress"
                                                                className="flex flex-col gap-3"
                                                        >
                                                                <ol className="flex items-center gap-2" role="list">
                                                                        {DASHBOARD_TOUR_STEPS.map((step, index) => (
                                                                                <li
                                                                                        key={step.id}
                                                                                        className={cn(
                                                                                                "h-2 flex-1 rounded-full",
                                                                                                index <= currentStep
                                                                                                        ? "bg-primary"
                                                                                                        : "bg-muted",
                                                                                        )}
                                                                                        aria-hidden="true"
                                                                                />
                                                                        ))}
                                                                </ol>
                                                                <div className="grid gap-2 rounded-md border border-dashed border-border/60 p-3 text-sm text-muted-foreground">
                                                                        <p className="flex items-center gap-2 font-medium text-primary">
                                                                                <QuestionMarkCircledIcon className="size-4" />
                                                                                Tour steps
                                                                        </p>
                                                                        <ul className="grid gap-1 text-muted-foreground" role="list">
                                                                                {DASHBOARD_TOUR_STEPS.map((step, index) => (
                                                                                        <li
                                                                                                key={step.id}
                                                                                                className={cn(
                                                                                                        "flex items-start gap-2 rounded-md px-2 py-1",
                                                                                                        index === currentStep
                                                                                                                ? "bg-primary/10 text-primary"
                                                                                                                : "text-muted-foreground",
                                                                                                )}
                                                                                                aria-current={index === currentStep ? "step" : undefined}
                                                                                        >
                                                                                                <span className="mt-1 size-2 rounded-full bg-current" aria-hidden="true" />
                                                                                                <span className="text-xs font-medium uppercase tracking-wide">
                                                                                                        {step.title}
                                                                                                </span>
                                                                                        </li>
                                                                                ))}
                                                                        </ul>
                                                                </div>
                                                        </nav>

                                                        <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                                <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        className="justify-start px-0 text-sm font-medium text-muted-foreground hover:text-foreground"
                                                                        onClick={skipTour}
                                                                        disabled={isPending}
                                                                >
                                                                        Skip tour
                                                                </Button>
                                                                <div className="flex gap-2">
                                                                        <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                onClick={goToPrevious}
                                                                                disabled={currentStep === 0 || isPending}
                                                                        >
                                                                                Back
                                                                        </Button>
                                                                        <Button
                                                                                type="button"
                                                                                onClick={goToNext}
                                                                                disabled={isPending}
                                                                        >
                                                                                {currentStep === DASHBOARD_TOUR_STEPS.length - 1
                                                                                        ? "Finish"
                                                                                        : "Next"}
                                                                        </Button>
                                                                </div>
                                                        </DialogFooter>
                                                </DialogContent>
                                        </Dialog>
                                        {isOpen && highlight ? (
                                                <div
                                                        aria-hidden="true"
                                                        className="pointer-events-none fixed z-[60] rounded-xl border-2 border-primary shadow-[0_0_0_9999px_rgba(9,9,11,0.55)] transition-[top,left,width,height] duration-300"
                                                        style={{
                                                                top: highlight.top,
                                                                left: highlight.left,
                                                                width: highlight.width,
                                                                height: highlight.height,
                                                        }}
                                                />
                                        ) : null}
                                </>
                        )}
                </FirstRunTourContext.Provider>
        );
}

function useHighlightRect(selector: string | undefined, active: boolean) {
        const [rect, setRect] = useState<HighlightRect | null>(null);

        useEffect(() => {
                if (!active || !selector) {
                        setRect(null);
                        return;
                }

                const element = document.querySelector<HTMLElement>(selector);

                if (!element) {
                        setRect(null);
                        return;
                }

                const update = () => {
                        const elementRect = element.getBoundingClientRect();

                        if (!elementRect || (elementRect.width === 0 && elementRect.height === 0)) {
                                setRect(null);
                                return;
                        }

                        setRect({
                                top: Math.max(0, elementRect.top - 12),
                                left: Math.max(0, elementRect.left - 12),
                                width: elementRect.width + 24,
                                height: elementRect.height + 24,
                        });
                };

                update();

                window.addEventListener("resize", update);
                window.addEventListener("scroll", update, true);

                let observer: ResizeObserver | null = null;

                if ("ResizeObserver" in window) {
                        observer = new ResizeObserver(update);
                        observer.observe(element);
                }

                return () => {
                        window.removeEventListener("resize", update);
                        window.removeEventListener("scroll", update, true);
                        observer?.disconnect();
                };
        }, [selector, active]);

        return rect;
}
