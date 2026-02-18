import { NextResponse } from "next/server"
import { performance } from "perf_hooks"

import {
        loadRecentDocumentsUncached,
        loadRentSummaryUncached,
        loadRoommateUpdatesUncached,
        loadWelcomeMessageUncached,
} from "@/app/dashboard/(dashboard)/data"

export async function GET() {
        const sequentialStart = performance.now()
        await loadWelcomeMessageUncached()
        await loadRentSummaryUncached()
        await loadRecentDocumentsUncached()
        await loadRoommateUpdatesUncached()
        const sequentialDuration = performance.now() - sequentialStart

        const parallelStart = performance.now()
        await Promise.all([
                loadWelcomeMessageUncached(),
                loadRentSummaryUncached(),
                loadRecentDocumentsUncached(),
                loadRoommateUpdatesUncached(),
        ])
        const parallelDuration = performance.now() - parallelStart

        return NextResponse.json({
                sequentialDuration,
                parallelDuration,
                improvement: sequentialDuration - parallelDuration,
        })
}
