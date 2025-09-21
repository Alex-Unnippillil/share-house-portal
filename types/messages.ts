import type { Database } from "@/lib/supabase"

export type TenantRole = Database["public"]["Enums"]["tenant_role"]
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
export type ThreadRow = Database["public"]["Tables"]["threads"]["Row"]
export type MessageRow = Database["public"]["Tables"]["messages"]["Row"]
export type MessageReactionRow = Database["public"]["Tables"]["message_reactions"]["Row"]
export type MessageModerationRow = Database["public"]["Tables"]["message_moderation"]["Row"]

export type ProfileSummary = Pick<
  ProfileRow,
  "id" | "full_name" | "avatar_url" | "role" | "building_id" | "unit_id"
>

export type ReactionWithProfile = MessageReactionRow & {
  profile?: ProfileSummary | null
}

export type ModerationWithProfile = MessageModerationRow & {
  performed_by_profile?: ProfileSummary | null
}

export type MessageWithRelations = MessageRow & {
  author?: ProfileSummary | null
  reactions: ReactionWithProfile[]
  moderation: ModerationWithProfile[]
}

export type ThreadWithRelations = ThreadRow & {
  created_by_profile?: ProfileSummary | null
  pinned_by_profile?: ProfileSummary | null
  unit?: { id: string; name: string } | null
  building?: { id: string; name: string } | null
  messages: MessageWithRelations[]
}

export type PollMetadata = {
  poll_options?: { id: string; label: string }[]
  poll_votes?: Record<string, string[]>
  [key: string]: unknown
}
