import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"

import ChoreAssignmentsClient from "./components/chore-assignments-client"

type ChoreAssignment = Database["public"]["Tables"]["chore_assignments"]["Row"]

export const revalidate = 0

export default async function ChoresPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error("Failed to load authenticated user", userError)
  }

  if (!user) {
    redirect("/auth")
  }

  const { data, error } = await supabase
    .from("chore_assignments")
    .select(
      "id, chore_title, description, due_date, status, proof_url, completed_at, point_awarded, points, created_at, assigned_by, tenant_id"
    )
    .eq("tenant_id", user.id)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Unable to load chore assignments", error)
  }

  const assignments: ChoreAssignment[] = data ?? []

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">My chore assignments</h1>
        <p className="text-muted-foreground">
          Stay on top of your shared responsibilities. Upload proof when you finish a chore or toggle completion to keep your roommates in the loop.
        </p>
      </div>
      <ChoreAssignmentsClient initialAssignments={assignments} tenantId={user.id} />
    </div>
  )
}
