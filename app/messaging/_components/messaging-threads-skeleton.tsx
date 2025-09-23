import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function MessagingThreadsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px,1fr] xl:grid-cols-[320px,1fr]" role="status" aria-live="polite">
      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-4">
            <div className="space-y-2">
              <CardTitle>
                <span className="block h-5 w-40 animate-pulse rounded bg-muted" aria-hidden />
              </CardTitle>
              <CardDescription>
                <span className="block h-3 w-64 animate-pulse rounded bg-muted/70" aria-hidden />
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <span
                  key={index}
                  className="h-6 w-20 animate-pulse rounded-full border border-border/60 bg-muted/50"
                  aria-hidden
                />
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4"
                aria-hidden
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-44 animate-pulse rounded bg-muted/70" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="h-3 w-16 animate-pulse rounded bg-muted/60" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-muted/50" />
                    <div className="flex gap-1">
                      {Array.from({ length: 3 }).map((__, pillIndex) => (
                        <span
                          key={pillIndex}
                          className="h-6 w-6 animate-pulse rounded-full bg-muted/60"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {Array.from({ length: 3 }).map((__, statIndex) => (
                    <span key={statIndex} className="h-3 w-24 animate-pulse rounded bg-muted/50" />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="block h-5 w-32 animate-pulse rounded bg-muted" aria-hidden />
            </CardTitle>
            <CardDescription>
              <span className="block h-3 w-56 animate-pulse rounded bg-muted/70" aria-hidden />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="space-y-3 rounded-lg border border-border/60 bg-muted/40 p-4"
                aria-hidden
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-muted/60" />
                </div>
                <div className="h-2 w-full animate-pulse rounded bg-muted/50" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <span className="block h-5 w-44 animate-pulse rounded bg-muted" aria-hidden />
                <span className="block h-3 w-64 animate-pulse rounded bg-muted/70" aria-hidden />
              </div>
              <div className="h-6 w-24 animate-pulse rounded-full bg-muted/60" aria-hidden />
            </div>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <span key={index} className="h-3 w-28 animate-pulse rounded bg-muted/50" aria-hidden />
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="space-y-4">
                <article className="space-y-4 rounded-lg border border-border/60 bg-background/90 p-4" aria-hidden>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-muted/60" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-28 animate-pulse rounded bg-muted/60" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((__, paragraphIndex) => (
                      <div key={paragraphIndex} className="h-3 w-full animate-pulse rounded bg-muted/50" />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
                    <div className="h-8 w-full animate-pulse rounded-lg border border-dashed border-border/50 bg-muted/30" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-20 animate-pulse rounded bg-muted/60" />
                    <div className="space-y-1">
                      {Array.from({ length: 3 }).map((__, barIndex) => (
                        <div key={barIndex} className="h-2 w-full animate-pulse rounded bg-muted/40" />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 3 }).map((__, pillIndex) => (
                      <div
                        key={pillIndex}
                        className="h-8 w-16 animate-pulse rounded-full border border-dashed border-border/60 bg-muted/40"
                      />
                    ))}
                  </div>
                </article>
                {index === 0 ? <Separator /> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="block h-5 w-40 animate-pulse rounded bg-muted" aria-hidden />
            </CardTitle>
            <CardDescription>
              <span className="block h-3 w-56 animate-pulse rounded bg-muted/70" aria-hidden />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"
                aria-hidden
              >
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted/60" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-48 animate-pulse rounded bg-muted/60" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full border border-border/50 bg-muted/40" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <span className="sr-only">Loading messaging threads…</span>
    </div>
  )
}
