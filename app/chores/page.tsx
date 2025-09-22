import { RollAssignmentsButton } from "@/components/chores/roll-assignments-button"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

export default async function ChoresPage() {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isAdmin = false

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profileError && profile?.role === "admin") {
      isAdmin = true
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chores</h1>
          <p className="text-muted-foreground">
            Shared chore assignments and schedule will appear here.
          </p>
        </div>
        {isAdmin ? (
          <RollAssignmentsButton />
        ) : null}
      </div>

      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Use the manual roll to regenerate assignments if you need to adjust the rotation for the upcoming week.
      </div>
    </div>
  )
}

