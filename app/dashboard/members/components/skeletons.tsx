export function MemberTableSkeleton() {
        return (
                <div className="space-y-2 rounded-md border border-dashed border-muted-foreground/30 p-4">
                        <div className="h-6 w-32 animate-pulse rounded bg-muted/60" />
                        <div className="grid gap-2">
                                {Array.from({ length: 4 }).map((_, index) => (
                                        <div
                                                key={index}
                                                className="h-10 animate-pulse rounded-md bg-muted/40"
                                        />
                                ))}
                        </div>
                </div>
        )
}
