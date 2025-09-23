import RecentActivityPanel from "@/components/navigation/RecentActivityPanel"
import { fetchRecentActivity } from "@/lib/data/recent-activity"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

export default async function DashboardRecentActivityPanel() {
  const supabase = (await createSupbaseServerClientReadOnly()) as TypedSupabaseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  try {
    const { items, lastRoute } = await fetchRecentActivity({
      client: supabase,
      userId: user.id,
    })

    return <RecentActivityPanel items={items} lastRoute={lastRoute} />
  } catch (error) {
    console.error("Unable to load recent activity", error)
    return <RecentActivityPanel items={[]} lastRoute={null} />
  }
}
