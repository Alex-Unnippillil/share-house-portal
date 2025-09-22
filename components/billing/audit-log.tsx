import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrencyFromCents } from "@/lib/utils"

export type BillingAuditEvent = {
  id: string
  created_at: string
  event_type: string
  actor?: {
    full_name?: string | null
    email?: string | null
  } | null
  payload?: Record<string, unknown> | null
}

type BillingAuditLogProps = {
  events: BillingAuditEvent[]
}

const adjustmentCopy: Record<string, string> = {
  credit: "issued a credit",
  reversal: "reversed a credit",
}

function getActorName(event: BillingAuditEvent) {
  return event.actor?.full_name ?? event.actor?.email ?? "System"
}

function getPayload(event: BillingAuditEvent) {
  const payload = event.payload ?? {}
  return {
    type: typeof payload.type === "string" ? payload.type : undefined,
    amount_cents: typeof payload.amount_cents === "number" ? payload.amount_cents : undefined,
    previous_balance_cents:
      typeof payload.previous_balance_cents === "number" ? payload.previous_balance_cents : undefined,
    next_balance_cents: typeof payload.next_balance_cents === "number" ? payload.next_balance_cents : undefined,
    reason: typeof payload.reason === "string" ? payload.reason : undefined,
    memo: typeof payload.memo === "string" ? payload.memo : undefined,
    currency: typeof payload.currency === "string" ? payload.currency : undefined,
  }
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function BillingAuditLog({ events }: BillingAuditLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit trail</CardTitle>
        <CardDescription>Events captured for compliance whenever a balance adjustment is applied.</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
        ) : (
          <ul className="space-y-4">
            {events.map((event) => {
              const payload = getPayload(event)
              const adjustment = payload.type ? adjustmentCopy[payload.type] ?? "adjusted an invoice" : "adjusted an invoice"
              const actor = getActorName(event)
              const currency = payload.currency ?? "USD"
              const amount = payload.amount_cents ? formatCurrencyFromCents(Math.abs(payload.amount_cents), currency) : null
              const previousBalance =
                typeof payload.previous_balance_cents === "number"
                  ? formatCurrencyFromCents(payload.previous_balance_cents, currency)
                  : null
              const nextBalance =
                typeof payload.next_balance_cents === "number"
                  ? formatCurrencyFromCents(payload.next_balance_cents, currency)
                  : null

              return (
                <li key={event.id} className="rounded-lg border border-border/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{actor}</span>
                    <span>{formatDateTime(event.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">
                    {actor} {adjustment}
                    {amount ? ` (${amount})` : ""}
                    {payload.reason ? ` — ${payload.reason}` : ""}
                  </p>
                  {(payload.memo || previousBalance || nextBalance) && (
                    <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                      {previousBalance && (
                        <div>
                          <dt className="font-medium text-foreground">Previous balance</dt>
                          <dd>{previousBalance}</dd>
                        </div>
                      )}
                      {nextBalance && (
                        <div>
                          <dt className="font-medium text-foreground">New balance</dt>
                          <dd>{nextBalance}</dd>
                        </div>
                      )}
                      {payload.memo && (
                        <div className="sm:col-span-2">
                          <dt className="font-medium text-foreground">Internal memo</dt>
                          <dd>{payload.memo}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
