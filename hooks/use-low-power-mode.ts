"use client";

import { useEffect, useMemo, useState } from "react";

type NavigatorWithMemory = Navigator & {
        deviceMemory?: number;
};

function evaluateLowPower(): boolean {
        if (typeof window === "undefined") {
                return false;
        }

        const nav = navigator as NavigatorWithMemory;
        const hardwareConcurrency = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : 8;
        const deviceMemory = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 8;
        const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

        return prefersReducedMotion || hardwareConcurrency <= 4 || deviceMemory <= 4;
}

export function useLowPowerMode() {
        const [isLowPower, setIsLowPower] = useState<boolean>(() => false);

        useEffect(() => {
                if (typeof window === "undefined") {
                        return;
                }

                const updateLowPower = () => {
                        setIsLowPower(evaluateLowPower());
                };

                updateLowPower();

                const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

                if (mediaQuery) {
                        mediaQuery.addEventListener("change", updateLowPower);
                }

                return () => {
                        if (mediaQuery) {
                                mediaQuery.removeEventListener("change", updateLowPower);
                        }
                };
        }, []);

        return useMemo(() => isLowPower, [isLowPower]);
}
