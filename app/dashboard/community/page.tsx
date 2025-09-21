import CommunityBoard from "./components/community-board"

import { createSupbaseServerClient } from "@/utils/supaone"

export default async function CommunityPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  const userId = session.user.id

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", userId)
    .maybeSingle()

  const { data: channels } = await supabase
    .from("community_channels")
    .select(
      "id, name, description, topic, building, created_at, created_by, pinned_message_id"
    )
    .order("name", { ascending: true })

  const { data: messages } = await supabase
    .from("community_messages")
    .select(
      "id, channel_id, author_id, parent_id, title, content, created_at, is_deleted, is_pinned, author:profiles!community_messages_author_id_fkey (id, full_name, avatar_url, role)"
    )
    .order("created_at", { ascending: true })

  const viewerProfile = profile
    ? {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
      }
    : null

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Community board</h1>
        <p className="text-muted-foreground">
          Connect with residents across buildings, stay informed, and collaborate in real time.
        </p>
      </div>
      <CommunityBoard
        initialChannels={channels ?? []}
        initialMessages={(messages ?? []).map((message) => ({
          ...message,
          author: message.author ?? null,
        }))}
        viewerId={userId}
        viewerRole={profile?.role ?? null}
        viewerProfile={viewerProfile}
      />
    </div>
  )
}
