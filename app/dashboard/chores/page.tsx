import PendingSwapList from "@/components/chores/pending-swap-list"
import type { ChoreSwapWithAssignments } from "@/components/chores/types"
import { acceptChoreSwapAction, declineChoreSwapAction } from "./actions"

import { createSupbaseServerClient } from "@/utils/supaone"

export const dynamic = "force-dynamic"

export default async function ChoreSwapsPage() {
  try {
    const supabase = await createSupbaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      throw userError
    }

    if (!user) {
      return (
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">Chore swaps</h1>
          <p className="text-muted-foreground">Sign in to manage chore swap proposals.</p>
        </div>
      )
    }

    const { data, error } = await supabase
      .from("chore_swaps")
      .select(
        `*,
        requester:requester_id (id, full_name),
        counterparty:counterparty_id (id, full_name),
        requester_assignment:requester_assignment_id (id, assignment_label, assignment_date, assigned_profile_id, credits, created_at, created_by, updated_at),
        counterparty_assignment:counterparty_assignment_id (id, assignment_label, assignment_date, assigned_profile_id, credits, created_at, created_by, updated_at)
      `,
      )
      .or(`requester_id.eq.${user.id},counterparty_id.eq.${user.id}`)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    const swaps = (data ?? []) as ChoreSwapWithAssignments[]

    return (
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Chore swaps</h1>
          <p className="text-muted-foreground">
            Coordinate household duties, document approvals, and keep credit balances transparent when you trade chores.
          </p>
        </header>
        <PendingSwapList
          viewerId={user.id}
          swaps={swaps}
          acceptAction={acceptChoreSwapAction}
          declineAction={declineChoreSwapAction}
        />
      </div>
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while loading chore swaps."
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Chore swaps</h1>
        <p className="text-sm text-destructive">{message}</p>
      </div>
    )
  }
}
