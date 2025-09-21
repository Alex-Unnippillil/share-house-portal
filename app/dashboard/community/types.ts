import type { Database } from "@/lib/supabase"

export type CommunityChannel = Database["public"]["Tables"]["community_channels"]["Row"]

export type CommunityMessageRow = Database["public"]["Tables"]["community_messages"]["Row"]

export type CommunityProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "avatar_url" | "role"
>

export type CommunityMessage = CommunityMessageRow & {
  author?: CommunityProfile | null
  optimisticId?: string
  pending?: boolean
}

export type CommunityThread = {
  root: CommunityMessage
  replies: CommunityMessage[]
}
