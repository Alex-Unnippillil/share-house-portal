import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, roundToCurrency } from "@/lib/payments/currency"
import {
  loadBillingPreview,
  type SubscriptionProrationPreviewInput,
} from "@/lib/payments/stripe-billing"

function resolvePreviewInput():
  | { params: SubscriptionProrationPreviewInput; targetPlanLabel: string }
  | null {
  const customerId = process.env.STRIPE_BILLING_CUSTOMER_ID
  const subscriptionId = process.env.STRIPE_BILLING_SUBSCRIPTION_ID
  const newPriceId = process.env.STRIPE_BILLING_TARGET_PRICE_ID

  if (!customerId || !subscriptionId || !newPriceId) {
    return null
  }

  const subscriptionItemId = process.env.STRIPE_BILLING_SUBSCRIPTION_ITEM_ID
  const quantityRaw = process.env.STRIPE_BILLING_TARGET_QUANTITY
  const parsedQuantity = quantityRaw ? Number.parseInt(quantityRaw, 10) : undefined
  const newQuantity = Number.isFinite(parsedQuantity) ? parsedQuantity : undefined

  const planLabel = process.env.STRIPE_BILLING_TARGET_PLAN_LABEL ?? "the selected plan"

  return {
    params: {
      customerId,
      subscriptionId,
      newPriceId,
      subscriptionItemId: subscriptionItemId || undefined,
      newQuantity,
    },
    targetPlanLabel: planLabel,
  }
}

function formatSignedCurrency(amount: number, currency: string): string {
  if (amount === 0) {
    return formatCurrency(amount, currency)
  }

  const formatted = formatCurrency(Math.abs(amount), currency)
  return amount > 0 ? `+${formatted}` : `-${formatted}`
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
      new Date(iso),
    )
  } catch (error) {
    return iso
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch (error) {
    return iso
  }
}

function formatPeriod(start?: string, end?: string): string | null {
  if (!start && !end) {
    return null
  }

  if (start && end) {
    return `${formatDate(start)} – ${formatDate(end)}`
  }

  return formatDate(start ?? end ?? "")
}

export default async function BillingPage() {
  const config = resolvePreviewInput()

  const header = (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Billing preview</h1>
      <p className="text-muted-foreground">
        Understand how upcoming plan changes will adjust your Stripe invoice.
      </p>
    </div>
  )

  if (!config) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardHeader>
            <CardTitle>Connect Stripe to preview billing</CardTitle>
            <CardDescription>
              Provide the required Stripe identifiers in your environment to load
              proration data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>STRIPE_BILLING_CUSTOMER_ID</li>
              <li>STRIPE_BILLING_SUBSCRIPTION_ID</li>
              <li>STRIPE_BILLING_TARGET_PRICE_ID</li>
              <li className="text-xs">
                Optional: STRIPE_BILLING_SUBSCRIPTION_ITEM_ID, STRIPE_BILLING_TARGET_QUANTITY,
                STRIPE_BILLING_TARGET_PLAN_LABEL
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  }

  let errorMessage: string | null = null
  let preview: Awaited<ReturnType<typeof loadBillingPreview>> | null = null

  try {
    preview = await loadBillingPreview(config.params)
  } catch (error) {
    console.error("Unable to load Stripe billing preview", error)
    errorMessage =
      error instanceof Error ? error.message : "Unable to load Stripe billing preview."
  }

  if (!preview || errorMessage) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardHeader>
            <CardTitle>Unable to load billing preview</CardTitle>
            <CardDescription>
              Stripe responded with an error while generating the proration estimate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">
              {errorMessage ?? "Stripe billing preview is currently unavailable."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { proration, credits, reconciliationLog } = preview
  const appliedCreditEntry = reconciliationLog.find(
    (entry) => entry.source === "credit_balance",
  )
  const appliedCredit = appliedCreditEntry?.amount ?? 0
  const remainingCredit = roundToCurrency(
    Math.max(credits.totalAvailable - appliedCredit, 0),
  )

  return (
    <div className="space-y-6">
      {header}

      <Card>
        <CardHeader>
          <CardTitle>Proration estimate</CardTitle>
          <CardDescription>
            Based on switching to {config.targetPlanLabel}. Updated totals will apply on
            your next invoice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-4">
              <dt className="text-sm text-muted-foreground">Net proration impact</dt>
              <dd
                className={`text-2xl font-semibold ${
                  proration.prorationAmount >= 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {formatSignedCurrency(proration.prorationAmount, proration.currency)}
              </dd>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <dt className="text-sm text-muted-foreground">Invoice total</dt>
              <dd className="text-2xl font-semibold">
                {formatCurrency(proration.total, proration.currency)}
              </dd>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <dt className="text-sm text-muted-foreground">Next invoice date</dt>
              <dd className="text-lg font-medium">
                {formatDateTime(proration.nextInvoiceDate)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Proration breakdown</CardTitle>
            <CardDescription>
              Detailed view of the upcoming invoice line items generated by Stripe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proration.lineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No proration adjustments are scheduled for this subscription.
                </p>
              ) : (
                proration.lineItems.map((item) => {
                  const periodLabel = formatPeriod(item.periodStart, item.periodEnd)
                  const amountClass =
                    item.amount > 0
                      ? "text-rose-600"
                      : item.amount < 0
                      ? "text-emerald-600"
                      : "text-muted-foreground"

                  return (
                    <div key={item.id} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {item.isProration ? "Proration" : "Line item"}
                          {periodLabel ? ` · ${periodLabel}` : null}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ${amountClass}`}>
                        {formatSignedCurrency(item.amount, proration.currency)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credit balance</CardTitle>
            <CardDescription>
              Monitor available credits and how much will apply to the next invoice.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-sm text-muted-foreground">Customer balance credits</dt>
                <dd className="text-lg font-semibold">
                  {formatCurrency(credits.customerBalance, credits.currency)}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm text-muted-foreground">Cash balance</dt>
                <dd className="text-lg font-semibold">
                  {formatCurrency(credits.cashBalance, credits.currency)}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm text-muted-foreground">Total available credits</dt>
                <dd className="text-lg font-semibold">
                  {formatCurrency(credits.totalAvailable, credits.currency)}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm text-muted-foreground">Applied to upcoming invoice</dt>
                <dd className="text-lg font-semibold text-emerald-600">
                  {formatCurrency(appliedCredit, credits.currency)}
                </dd>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <dt className="text-sm text-muted-foreground">Projected remaining credit</dt>
                <dd className="text-lg font-semibold">
                  {formatCurrency(remainingCredit, credits.currency)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reconciliation log</CardTitle>
          <CardDescription>
            Audit how proration adjustments and credits will reconcile on the next invoice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reconciliationLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reconciliation items yet.</p>
          ) : (
            <div className="space-y-4">
              {reconciliationLog.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{entry.description}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {entry.source === "proration" ? "Proration" : "Credit balance"} ·
                      {" "}
                      {formatDateTime(entry.occurredAt)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      entry.direction === "credit" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {formatSignedCurrency(
                      entry.direction === "credit" ? -entry.amount : entry.amount,
                      proration.currency,
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
