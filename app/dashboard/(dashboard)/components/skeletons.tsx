function Skeleton({ className }: { className: string }) {
        return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

export function DashboardHeaderSkeleton() {
        return <Skeleton className="h-10 w-full" />
}

export function DashboardCardSkeleton() {
        return <Skeleton className="h-40 w-full" />
}

export function DashboardBoardSkeleton() {
        return <Skeleton className="h-48 w-full" />
}
