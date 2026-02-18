import {
        DashboardBoardSkeleton,
        DashboardCardSkeleton,
        DashboardHeaderSkeleton,
} from "./components/skeletons"

export default function LoadingDashboardSegment() {
        return (
                <div className="w-full space-y-6">
                        <DashboardHeaderSkeleton />
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <DashboardCardSkeleton />
                                <DashboardCardSkeleton />
                        </div>
                        <DashboardBoardSkeleton />
                </div>
        )
}
