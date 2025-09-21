import type { Database } from "@/lib/supabase"

export type ProfileSummary = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "avatar_url" | "role"
>

export type ThreadRow = Database["public"]["Tables"]["threads"]["Row"]

export type ThreadWithRelations = ThreadRow & {
  created_by_profile?: ProfileSummary | null
  messages?: MessageWithRelations[] | null
}

export type MessageRow = Database["public"]["Tables"]["messages"]["Row"]

export type ReactionRow = Database["public"]["Tables"]["message_reactions"]["Row"]

export type ModerationRow = Database["public"]["Tables"]["message_moderation"]["Row"]

export type ReactionWithProfile = ReactionRow & {
  reactor_profile?: ProfileSummary | null
}

export type ModerationWithProfile = ModerationRow & {
  moderator_profile?: ProfileSummary | null
}

export type MessageWithRelations = MessageRow & {
  created_by_profile?: ProfileSummary | null
  message_reactions?: ReactionWithProfile[] | null
  message_moderation?: ModerationWithProfile[] | null
}

export type TenantAssignmentRow = Database["public"]["Tables"]["tenant_assignments"]["Row"]

export type BuildingRow = Database["public"]["Tables"]["buildings"]["Row"]

export type UnitRow = Database["public"]["Tables"]["units"]["Row"]

export type TenantRole = TenantAssignmentRow["role"]

export interface PollOptionMeta {
  id: string
  label: string
}

export interface PollMetadata {
  allowMultiple?: boolean
  options: PollOptionMeta[]
}

export interface MessageMetadataShape {
  clientRef?: string
  poll?: PollMetadata
  maintenanceTicketId?: string
  flagged?: boolean
  [key: string]: unknown
}

export type MessageMetadata = MessageMetadataShape | null

export interface NotificationBridgePayload {
  maintenanceTicketId?: string
  messageId: string
  threadId: string
  buildingId: string
  unitId?: string | null
  action: "new_message" | "status_update" | "moderation"
}
