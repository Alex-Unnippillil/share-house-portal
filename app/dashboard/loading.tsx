export default function LoadingDashboard() {
        return (
                <div className="flex w-full">
                        <div className="hidden h-screen w-72 animate-pulse bg-muted/40 lg:block" />
                        <div className="flex-1 space-y-6 bg-gray-100 p-5 sm:p-10 dark:bg-inherit">
                                <div className="h-10 w-32 animate-pulse rounded-md bg-muted/60" />
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        <div className="h-40 animate-pulse rounded-md bg-muted/60" />
                                        <div className="h-40 animate-pulse rounded-md bg-muted/60" />
                                </div>
                                <div className="h-48 animate-pulse rounded-md bg-muted/60" />
                        </div>
                </div>
        )

}
