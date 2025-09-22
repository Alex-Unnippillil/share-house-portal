import type { ComponentProps } from "react"

import { cookies } from "next/headers"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/payments/currency"
import { Tables } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"

const paymentStatusConfig: Record<
  Tables<'rent_payments'>['status'],
  { label: string; variant: ComponentProps<typeof Badge>['variant'] }
> = {
  succeeded: { label: "Succeeded", variant: "complete" },
  pending: { label: "Pending", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
}

const subscriptionStatusConfig: Record<
  Tables<'subscriptions'>['status'],
  { label: string; variant: ComponentProps<typeof Badge>['variant'] }
> = {
  active: { label: "Active", variant: "complete" },
  past_due: { label: "Past due", variant: "destructive" },
  unpaid: { label: "Unpaid", variant: "destructive" },
  canceled: { label: "Canceled", variant: "outline" },
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "—"
  }

  try {
    return format(new Date(value), "MMM d, yyyy")
  } catch (error) {
    console.error("Unable to format date", error)
    return "—"
  }
}

export async function PaymentStatusOverview() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment activity</CardTitle>
          <CardDescription>Sign in to review your latest rent payments and autopay subscriptions.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Rent payments and subscription statuses are stored securely in Supabase once Stripe confirms each event. Sign in to
            access your payment history.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <a href="/auth">Go to sign in</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const [paymentsResponse, subscriptionsResponse] = await Promise.all([
    supabase
      .from("rent_payments")
      .select("id, amount, currency, status, description, processed_at, created_at, receipt_url, metadata")
      .eq("user_id", user.id)
      .order("processed_at", { ascending: false })
      .limit(5),
    supabase
      .from("subscriptions")
      .select(
        "id, stripe_subscription_id, status, amount, currency, interval, current_period_end, cancel_at_period_end, metadata"
      )
      .eq("user_id", user.id)
      .order("current_period_end", { ascending: false })
      .limit(5),
  ])

  if (paymentsResponse.error) {
    console.error("Failed to load rent payments", paymentsResponse.error)
  }
  if (subscriptionsResponse.error) {
    console.error("Failed to load subscriptions", subscriptionsResponse.error)
  }

  const rentPayments = paymentsResponse.data ?? []
  const subscriptions = subscriptionsResponse.data ?? []

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Recent rent payments</CardTitle>
          <CardDescription>Statuses are synced from Stripe webhooks and stored in Supabase.</CardDescription>
        </CardHeader>
        <CardContent>
          {rentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rent payments recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {rentPayments.map((payment) => {
                const statusConfig = paymentStatusConfig[payment.status]
                const amountDisplay = formatCurrency(payment.amount ?? 0, payment.currency ?? "USD")
                const processedAt = payment.processed_at ?? payment.created_at ?? null
                const receiptUrl = payment.receipt_url

                return (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{amountDisplay}</p>
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {payment.description ?? "Rent payment"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Processed {formatDateLabel(processedAt)}
                      </p>
                    </div>
                    {receiptUrl ? (
                      <Button asChild size="sm" variant="outline" className="self-start sm:self-auto">
                        <a href={receiptUrl} target="_blank" rel="noreferrer">
                          View receipt
                        </a>
                      </Button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Autopay subscriptions</CardTitle>
          <CardDescription>Stripe subscription states are normalized before persisting to Supabase.</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active subscriptions on file.</p>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription) => {
                const statusConfig = subscriptionStatusConfig[subscription.status]
                const amountDisplay = formatCurrency(subscription.amount ?? 0, subscription.currency ?? "USD")
                const renewsOn = formatDateLabel(subscription.current_period_end)
                const planInterval = subscription.interval === "year" ? "yearly" : "monthly"
                const cancelCopy = subscription.cancel_at_period_end
                  ? "Cancellation scheduled at period end"
                  : undefined

                return (
                  <div key={subscription.id} className="space-y-2 rounded-lg border bg-muted/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{amountDisplay} · {planInterval}</p>
                        <p className="text-xs text-muted-foreground">
                          Subscription ID: {subscription.stripe_subscription_id ?? "—"}
                        </p>
                      </div>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>Renews {renewsOn}</span>
                      {cancelCopy ? <span>{cancelCopy}</span> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
