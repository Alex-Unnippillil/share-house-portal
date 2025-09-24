import { Badge } from "@/components/ui/badge"
import { CardDescription } from "@/components/ui/card"
import RotateKeyButton from "./RotateKeyButton"
import type { Database } from "@/lib/supabase"

type ClientRow = Database["public"]["Tables"]["oauth_clients"]["Row"]

type ActiveKey = Pick<
  Database["public"]["Tables"]["oauth_client_keys"]["Row"],
  "id" | "last_four" | "created_at"
>

export type DeveloperClientWithKey = ClientRow & {
  activeKey: ActiveKey | null
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export default function ClientList({
  clients,
}: {
  clients: DeveloperClientWithKey[]
}) {
  if (clients.length === 0) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>No OAuth clients have been created yet.</p>
        <p>Use the form above to provision credentials for an integration.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {clients.map(client => (
        <div
          key={client.id}
          className="rounded-lg border bg-card p-4 shadow-sm transition hover:shadow"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{client.client_name}</h2>
              <CardDescription>
                {client.description || "No description provided."}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {client.activeKey ? "Active" : "Pending"}
            </Badge>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Client ID</dt>
              <dd className="font-mono break-all">{client.client_id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Redirect URI</dt>
              <dd className="break-all">{client.redirect_uri ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Active key</dt>
              <dd>
                {client.activeKey?.last_four
                  ? `••••${client.activeKey.last_four}`
                  : "Not issued"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last rotated</dt>
              <dd>{formatTimestamp(client.last_rotated_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatTimestamp(client.created_at)}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <RotateKeyButton clientId={client.client_id} />
          </div>
        </div>
      ))}
    </div>
  )
}
