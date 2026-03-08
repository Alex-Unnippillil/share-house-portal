import { GenerateAssignmentsButton } from "./_components/generate-assignments-button"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

export default async function ChoresPage() {
  const supabase = await createSupbaseServerClientReadOnly()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role: string | null = null
  let householdId: string | null = null

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, household_id, unit_id, default_household_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profileError && profile) {
      role = (profile as any)?.role ?? null
      householdId =
        (profile as any)?.household_id ??
        (profile as any)?.unit_id ??
        (profile as any)?.default_household_id ??
        null
    }
  }

  const isAdmin = role === "admin" || role === "property_manager"
  const isSignedIn = Boolean(user)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Chores</h1>
        <p className="text-muted-foreground">
          Shared chore assignments and schedule will appear here.
        </p>
      </div>

      {isAdmin ? (
        <GenerateAssignmentsButton householdId={householdId} />
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          {isSignedIn
            ? "Only admins can generate automated chore assignments. Reach out to your property manager if you need updates."
            : "Sign in to review your household's chores and request updates."}
        </div>
      )}
    </div>
  )
}
