import type Stripe from "stripe"

import { getStripe } from "@/lib/stripe"
import { roundToCurrency } from "./currency"
import type {
  BillingCreditBalanceSummary,
  BillingPreview,
  BillingProrationLineItem,
  BillingProrationPreview,
  BillingReconciliationLogEntry,
} from "@/types/payments"

export interface SubscriptionProrationPreviewInput {
  customerId: string
  subscriptionId: string
  newPriceId: string
  subscriptionItemId?: string
  newQuantity?: number
  prorationDate?: number | Date
}

type UpcomingSubscriptionItem =
  Stripe.InvoiceRetrieveUpcomingParams.SubscriptionItem

function fromStripeAmount(value?: number | null): number {
  if (typeof value !== "number") {
    return 0
  }

  return roundToCurrency(value / 100)
}

function normalizeCurrency(currency?: string | null): string {
  return currency ? currency.toUpperCase() : "USD"
}

function toIsoDate(timestamp?: number | null): string | undefined {
  if (!timestamp) {
    return undefined
  }

  return new Date(timestamp * 1000).toISOString()
}

function mapLineItem(line: Stripe.InvoiceLineItem): BillingProrationLineItem {
  const description =
    line.description ||
    line.price?.nickname ||
    (typeof line.price?.product === "string"
      ? `Price ${line.price.product}`
      : "Subscription item")

  return {
    id: line.id,
    description,
    amount: fromStripeAmount(line.amount),
    isProration: Boolean(line.proration),
    periodStart: toIsoDate(line.period?.start),
    periodEnd: toIsoDate(line.period?.end),
  }
}

function resolveSubscriptionItems(
  subscription: Stripe.Subscription,
  targetItemId: string | undefined,
  newPriceId: string,
  newQuantity?: number,
): UpcomingSubscriptionItem[] {
  const items = subscription.items?.data ?? []
  if (items.length === 0) {
    throw new Error("Subscription has no items to preview proration for.")
  }

  const targetItem = targetItemId
    ? items.find((item) => item.id === targetItemId)
    : items[0]

  if (!targetItem) {
    throw new Error("Unable to locate subscription item for proration preview.")
  }

  return items.map((item) => {
    const base: UpcomingSubscriptionItem = { id: item.id }

    const quantity = item.quantity ?? undefined
    if (quantity !== undefined) {
      base.quantity = quantity
    }

    if (item.id === targetItem.id) {
      base.price = newPriceId
      base.quantity = newQuantity ?? quantity
    }

    return base
  })
}

export async function previewSubscriptionProration(
  input: SubscriptionProrationPreviewInput,
): Promise<BillingProrationPreview> {
  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(input.subscriptionId, {
    expand: ["items.data.price"],
  })

  const subscriptionItems = resolveSubscriptionItems(
    subscription,
    input.subscriptionItemId,
    input.newPriceId,
    input.newQuantity,
  )

  const prorationDate =
    input.prorationDate instanceof Date
      ? Math.floor(input.prorationDate.getTime() / 1000)
      : input.prorationDate

  const upcomingParams: Stripe.InvoiceRetrieveUpcomingParams = {
    customer: input.customerId,
    subscription: input.subscriptionId,
    subscription_items: subscriptionItems,
    subscription_proration_behavior: "create_prorations",
  }

  if (prorationDate) {
    upcomingParams.subscription_proration_date = prorationDate
  }

  const upcoming = await stripe.invoices.retrieveUpcoming(upcomingParams)
  const currency = normalizeCurrency(upcoming.currency || subscription.currency)

  const lineItems = upcoming.lines?.data?.map(mapLineItem) ?? []

  const prorationAmount = roundToCurrency(
    lineItems
      .filter((item) => item.isProration)
      .reduce((total, item) => total + item.amount, 0),
  )

  const subtotal = fromStripeAmount(upcoming.subtotal ?? upcoming.amount_due)
  const total = fromStripeAmount(upcoming.total ?? upcoming.amount_due)

  const invoiceTimestamp =
    upcoming.next_payment_attempt ??
    upcoming.due_date ??
    upcoming.period_end ??
    upcoming.created

  return {
    currency,
    subtotal,
    total,
    prorationAmount,
    nextInvoiceDate: toIsoDate(invoiceTimestamp) ?? new Date().toISOString(),
    lineItems,
  }
}

export async function getCustomerCreditBalance(
  customerId: string,
): Promise<BillingCreditBalanceSummary> {
  const stripe = getStripe()
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["cash_balance"],
  })

  if (!customer || ("deleted" in customer && customer.deleted)) {
    throw new Error("Stripe customer not found for credit balance lookup.")
  }

  const currency = normalizeCurrency(customer.currency)
  const customerBalanceCents = customer.balance ?? 0
  const customerCredit =
    customerBalanceCents < 0 ? fromStripeAmount(Math.abs(customerBalanceCents)) : 0

  const cashBalanceRaw =
    customer.cash_balance?.available?.[currency.toLowerCase()] ?? 0
  const cashBalance = cashBalanceRaw > 0 ? fromStripeAmount(cashBalanceRaw) : 0

  const totalAvailable = roundToCurrency(customerCredit + cashBalance)

  return {
    currency,
    customerBalance: customerCredit,
    cashBalance,
    totalAvailable,
  }
}

export function buildReconciliationLog(
  proration: BillingProrationPreview,
  credits: BillingCreditBalanceSummary,
): BillingReconciliationLogEntry[] {
  const entries: BillingReconciliationLogEntry[] = proration.lineItems
    .filter((item) => item.isProration)
    .map((item) => ({
      id: `proration_${item.id}`,
      occurredAt: item.periodEnd ?? item.periodStart ?? proration.nextInvoiceDate,
      description: item.description,
      amount: roundToCurrency(Math.abs(item.amount)),
      direction: item.amount >= 0 ? "charge" : "credit",
      source: "proration" as const,
    }))

  const prorationCharges = proration.lineItems
    .filter((item) => item.isProration && item.amount > 0)
    .reduce((total, item) => total + item.amount, 0)

  const creditApplication = Math.min(prorationCharges, credits.totalAvailable)

  if (creditApplication > 0) {
    entries.push({
      id: "credit_application",
      occurredAt: proration.nextInvoiceDate,
      description: "Credits applied to proration charges",
      amount: roundToCurrency(creditApplication),
      direction: "credit",
      source: "credit_balance",
    })
  }

  return entries.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )
}

export async function loadBillingPreview(
  input: SubscriptionProrationPreviewInput,
): Promise<BillingPreview> {
  const [proration, credits] = await Promise.all([
    previewSubscriptionProration(input),
    getCustomerCreditBalance(input.customerId),
  ])

  return {
    proration,
    credits,
    reconciliationLog: buildReconciliationLog(proration, credits),
  }
}
