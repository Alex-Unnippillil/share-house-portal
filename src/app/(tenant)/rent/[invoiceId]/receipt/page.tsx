import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"

import { PrintButton } from "./print-button"
import { formatCurrency } from "@/lib/payments/currency"
import { createSupbaseServerClient } from "@/utils/supaone"

export const dynamic = "force-dynamic"

interface RentPaymentRecord {
  id: string | number
  amount: number
  currency: string
  description: string | null
  status: string | null
  processed_at: string | null
  receipt_url: string | null
  tenant_id: string | null
  unit_id: string | null
  payment_method_type: string | null
  metadata: Record<string, unknown> | null
  stripe_payment_intent_id?: string | null
  stripe_charge_id?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  billing_period_start?: string | null
  billing_period_end?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface TenantProfileSummary {
  full_name: string | null
  email: string | null
}

interface ReceiptData {
  payment: RentPaymentRecord
  tenant: TenantProfileSummary | null
  invoiceId: string
}

interface ReceiptPageProps {
  params: {
    invoiceId: string
  }
}

async function getReceiptData(invoiceId: string): Promise<ReceiptData | null> {
  const supabase = await createSupbaseServerClient()

  const { data, error, status } = await (supabase as any)
    .from("rent_payments")
    .select("*")
    .eq("metadata->>invoice_id", invoiceId)
    .maybeSingle()

  if (error && status !== 406) {
    console.error("Failed to load rent receipt", error)
    throw new Error("Unable to load receipt")
  }

  if (!data) {
    return null
  }

  const payment = data as RentPaymentRecord

  let tenant: TenantProfileSummary | null = null
  if (payment.tenant_id) {
    const { data: tenantRow } = await supabase
      .from("profiles")
      .select("full_name,email")
      .eq("id", payment.tenant_id)
      .maybeSingle()

    tenant = tenantRow ?? null
  }

  return {
    payment,
    tenant,
    invoiceId,
  }
}

function formatDateTime(value: string | null | undefined, fallbackLabel = "—") {
  if (!value) {
    return fallbackLabel
  }

  try {
    return format(new Date(value), "PPP p")
  } catch (error) {
    return fallbackLabel
  }
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    return format(new Date(value), "PPP")
  } catch (error) {
    return null
  }
}

export async function generateMetadata({ params }: ReceiptPageProps): Promise<Metadata> {
  const invoiceId = params.invoiceId
  return {
    title: `Rent receipt ${invoiceId}`,
  }
}

export default async function RentReceiptPage({ params }: ReceiptPageProps) {
  const receipt = await getReceiptData(params.invoiceId)

  if (!receipt) {
    notFound()
  }

  const { payment, tenant, invoiceId } = receipt
  const metadata = (payment.metadata ?? {}) as Record<string, unknown>
  const amountDisplay = formatCurrency(payment.amount, payment.currency)
  const processedAt = formatDateTime(payment.processed_at ?? payment.created_at ?? null)
  const billingPeriodStart = formatDateOnly(payment.billing_period_start)
  const billingPeriodEnd = formatDateOnly(payment.billing_period_end)
  const billingPeriodLabel =
    billingPeriodStart && billingPeriodEnd
      ? `${billingPeriodStart} – ${billingPeriodEnd}`
      : billingPeriodStart || billingPeriodEnd
  const generatedOn = formatDateTime(new Date().toISOString())
  const statusLabel = payment.status ? payment.status.replace(/_/g, " ") : "Completed"

  return (
    <main className="bg-muted/30 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4 print:max-w-none print:px-0">
        <div className="rounded-2xl border border-border bg-background p-8 shadow-sm print:border print:bg-white print:p-10 print:shadow-none">
          <header className="space-y-6 border-b border-border pb-6 print:border-muted print:pb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Rent payment receipt</p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground print:text-black">
                  Receipt #{typeof payment.id === "number" ? payment.id : invoiceId}
                </h1>
                <p className="text-sm text-muted-foreground print:text-black">
                  Please retain this receipt for your records. It confirms the rent payment processed through Share House Portal.
                </p>
              </div>
              <PrintButton className="self-start" />
            </div>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invoice ID</dt>
                  <dd className="font-medium text-foreground print:text-black">{invoiceId}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Processed on</dt>
                  <dd className="font-medium text-foreground print:text-black">{processedAt}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</dt>
                  <dd className="font-medium capitalize text-foreground print:text-black">{statusLabel}</dd>
                </div>
              </dl>
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tenant</dt>
                  <dd className="font-medium text-foreground print:text-black">
                    {tenant?.full_name ?? metadata.tenant_name ?? payment.tenant_id ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
                  <dd className="text-foreground print:text-black">
                    {tenant?.email ?? metadata.tenant_email ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unit reference</dt>
                  <dd className="text-foreground print:text-black">{metadata.unit_label ?? payment.unit_id ?? "—"}</dd>
                </div>
              </dl>
            </div>
          </header>

          <section className="mt-8 space-y-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm print:border print:bg-white">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment summary</h2>
                <dl className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Amount paid</dt>
                    <dd className="font-semibold text-foreground print:text-black">{amountDisplay}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Payment method</dt>
                    <dd className="text-foreground print:text-black">
                      {payment.payment_method_type ? payment.payment_method_type.replace(/_/g, " ") : "Card"}
                    </dd>
                  </div>
                  {payment.stripe_payment_intent_id ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">Payment intent</dt>
                      <dd className="text-foreground print:text-black">{payment.stripe_payment_intent_id}</dd>
                    </div>
                  ) : null}
                  {payment.stripe_subscription_id ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">Subscription</dt>
                      <dd className="text-foreground print:text-black">{payment.stripe_subscription_id}</dd>
                    </div>
                  ) : null}
                  {metadata.billing_reason ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">Billing reason</dt>
                      <dd className="text-foreground print:text-black">{String(metadata.billing_reason)}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm print:border print:bg-white">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billing period</h2>
                <dl className="mt-3 space-y-2">
                  {billingPeriodLabel ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">Period</dt>
                      <dd className="text-foreground print:text-black">{billingPeriodLabel}</dd>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">This payment was processed as a one-time charge.</p>
                  )}
                  {payment.unit_id ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">Unit ID</dt>
                      <dd className="text-foreground print:text-black">{payment.unit_id}</dd>
                    </div>
                  ) : null}
                  {metadata.due_date ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">Due date</dt>
                      <dd className="text-foreground print:text-black">{formatDateOnly(String(metadata.due_date)) ?? "—"}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border print:border">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground print:bg-transparent">
                  <tr>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Quantity</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/60">
                    <td className="px-4 py-3 text-foreground print:text-black">
                      {payment.description ?? metadata.line_item_description ?? "Monthly rent"}
                    </td>
                    <td className="px-4 py-3 text-foreground print:text-black">1</td>
                    <td className="px-4 py-3 text-right text-foreground print:text-black">{amountDisplay}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/60">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground print:text-black" colSpan={2}>
                      Total paid
                    </th>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground print:text-black">{amountDisplay}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {payment.receipt_url ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 text-sm print:border print:bg-white">
                <p className="font-medium text-foreground print:text-black">Stripe receipt</p>
                <p className="mt-1 text-muted-foreground">
                  A hosted receipt is also available at:{" "}
                  <Link
                    href={payment.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 print:text-black print:no-underline"
                  >
                    {payment.receipt_url}
                  </Link>
                </p>
              </div>
            ) : null}
          </section>

          <footer className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground print:border-muted print:text-black">
            <p>
              Generated on {generatedOn}. For questions about this payment please contact your property manager or reach out to
              support through the Share House Portal.
            </p>
            <p className="mt-2 font-medium text-foreground print:text-black">Thank you for your timely payment.</p>
          </footer>
        </div>
      </div>
    </main>
  )
}
