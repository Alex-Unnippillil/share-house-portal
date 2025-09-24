import { redirect } from "next/navigation"

import CreateClientForm from "./components/CreateClientForm"
import ClientList, {
  type DeveloperClientWithKey,
} from "./components/ClientList"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupbaseServerClient } from "@/utils/supaone"
import type { Database } from "@/lib/supabase"

export default async function DeveloperDashboardPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  type ProfileRow = Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "role" | "full_name"
  >

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>()

  if (profileError) {
    console.error(
      "[developer] Failed to load profile for developer dashboard",
      profileError
    )
    throw new Error("Unable to verify user permissions")
  }

  if (!profile || profile.role !== "admin") {
    console.warn("[developer] Non-admin redirected from developer dashboard", {
      userId: user.id,
      role: profile?.role ?? null,
    })
    redirect("/dashboard")
  }

  type ClientRow = Database["public"]["Tables"]["oauth_clients"]["Row"]
  type KeyRow = Database["public"]["Tables"]["oauth_client_keys"]["Row"]

  const { data: clients, error: clientsError } = await supabase
    .from("oauth_clients")
    .select(
      "id, client_id, client_name, redirect_uri, description, active_key_id, created_at, updated_at, last_rotated_at"
    )
    .order("created_at", { ascending: false })

  if (clientsError) {
    console.error("[developer] Failed to load OAuth clients", clientsError)
    throw new Error("Unable to load developer credentials")
  }

  let activeKeys: KeyRow[] = []
  if (clients && clients.length > 0) {
    const clientIds = clients.map(client => client.id)
    const { data: keyRows, error: keysError } = await supabase
      .from("oauth_client_keys")
      .select("id, client_id, status, last_four, created_at")
      .in("client_id", clientIds)
      .eq("status", "active")

    if (keysError) {
      console.error(
        "[developer] Failed to load active OAuth client keys",
        keysError
      )
    } else if (keyRows) {
      activeKeys = keyRows
    }
  }

  const clientsWithKeys: DeveloperClientWithKey[] = (clients ?? []).map(
    client => ({
      ...client,
      activeKey: activeKeys.find(key => key.client_id === client.id) ?? null,
    })
  )

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Developer credentials</h1>
        <p className="text-muted-foreground">
          Issue and rotate OAuth2 clients used by integrations. Client secrets
          are only shown once at creation or rotation time.
        </p>
      </header>

      <CreateClientForm />

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Issued OAuth clients</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientList clients={clientsWithKeys} />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
