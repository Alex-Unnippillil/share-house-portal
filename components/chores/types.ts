import type { Database } from "@/lib/supabase"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type ChoreAssignment = Database["public"]["Tables"]["chore_assignments"]["Row"]
export type ChoreSwap = Database["public"]["Tables"]["chore_swaps"]["Row"]

export type SwapProfileSummary = Pick<Profile, "id" | "full_name">

export type ChoreSwapWithAssignments = ChoreSwap & {
  requester_assignment?: ChoreAssignment | null
  counterparty_assignment?: ChoreAssignment | null
  requester?: SwapProfileSummary | null
  counterparty?: SwapProfileSummary | null
}

export type SwapActionResult = {
  success: boolean
  message?: string
  error?: string
}
