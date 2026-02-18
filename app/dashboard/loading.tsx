export default function LoadingDashboard() {
        return (
                <div className="flex min-h-screen w-full bg-background">
                        <div className="hidden min-h-screen w-72 animate-pulse bg-muted/40 lg:block" />
                        <div className="flex-1 space-y-6 bg-muted/30 p-content-gutter py-6 lg:py-8">
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
