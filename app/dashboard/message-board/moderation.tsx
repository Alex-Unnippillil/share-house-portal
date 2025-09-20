import type { Database } from "@/lib/supabase"
import type { ListTenantMessagesResult } from "@/app/(tenant)/message-board/actions"
import MessageBoardClient from "@/app/(tenant)/message-board/message-board-client"

const STAFF_ROLES = new Set(["admin", "staff", "manager"])

type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "avatar_url" | "role">
type MembershipWithRelations = Database["public"]["Tables"]["tenant_property_memberships"]["Row"] & {
  property: Pick<Database["public"]["Tables"]["properties"]["Row"], "id" | "name"> | null
  unit: Pick<Database["public"]["Tables"]["property_units"]["Row"], "id" | "label"> | null
}

type ModerationBoardProps = {
  profile: Profile
  memberships: MembershipWithRelations[]
  initialThreadId: string
  initialData: ListTenantMessagesResult
}

export default function ModerationBoard({
  profile,
  memberships,
  initialThreadId,
  initialData,
}: ModerationBoardProps) {
  const isStaff = STAFF_ROLES.has(profile.role ?? "")

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Message board moderation</h1>
        <p className="text-sm text-muted-foreground">
          Keep community conversations productive. Pin critical announcements, archive outdated threads, and remove posts that
          violate policies—all without leaving the dashboard.
        </p>
      </div>
      <MessageBoardClient
        profile={profile}
        memberships={memberships}
        initialThreadId={initialThreadId}
        initialData={initialData}
        allowModeration={true}
        initialIncludeRemoved={isStaff}
      />
    </div>
  )
}
