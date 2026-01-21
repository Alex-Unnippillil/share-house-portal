import { Button } from "@/components/ui/button"
import SmartLink from "@/components/navigation/SmartLink"
import { loadRecentActivity, type RecentActivityEntry } from "@/lib/recent-activity"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"
import { getWelcomeMessage } from "../data"
import RecentActivityResume from "./recent-activity-resume"

export async function DashboardWelcome() {
  const message = await getWelcomeMessage()
  let recentActivity: RecentActivityEntry[] = []

  try {
    const supabase = (await createSupbaseServerClientReadOnly()) as unknown as TypedSupabaseClient
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      recentActivity = await loadRecentActivity({
        supabase,
        userId: user.id,
      })
    }
  } catch (error) {
    recentActivity = []
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Resident dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {message.title}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">{message.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SmartLink href={message.primaryAction.href} intent="critical">
            <Button size="sm">{message.primaryAction.label}</Button>
          </SmartLink>
          {message.secondaryAction ? (
            <SmartLink href={message.secondaryAction.href} intent="passive">
              <Button variant="outline" size="sm">
                {message.secondaryAction.label}
              </Button>
            </SmartLink>
          ) : null}
        </div>
      </div>

      <RecentActivityResume initialEntries={recentActivity} />
    </div>
  )
}
