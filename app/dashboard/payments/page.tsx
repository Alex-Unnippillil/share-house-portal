import { redirect } from "next/navigation";

import { TenantPaymentsClient } from "./components/tenant-payments-client";
import { createSupbaseServerClient } from "@/utils/supaone";
import { parsePaymentLineItems } from "@/lib/payments/types";

export default async function PaymentsPage() {
  const supabase = await createSupbaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const profilePromise = supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  const billingMetadataPromise = supabase
    .from("tenant_billing_metadata")
    .select("tenant_id, autopay_enabled, autopay_status, monthly_rent_cents, currency, next_billing_date, stripe_subscription_id")
    .eq("tenant_id", user.id)
    .maybeSingle();

  const paymentsPromise = supabase
    .from("rent_payments")
    .select("id, tenant_id, amount_due_cents, amount_paid_cents, currency, status, due_date, paid_at, receipt_url, description, line_items, billing_period_start, billing_period_end")
    .eq("tenant_id", user.id)
    .order("due_date", { ascending: false })
    .order("created_at", { ascending: false });

  const [profile, billingMetadata, payments] = await Promise.all([
    profilePromise,
    billingMetadataPromise,
    paymentsPromise,
  ]);

  if (profile.error) {
    throw new Error(profile.error.message);
  }

  if (billingMetadata.error) {
    throw new Error(billingMetadata.error.message);
  }

  if (payments.error) {
    throw new Error(payments.error.message);
  }

  const tenantPayments = (payments.data ?? []).map((payment) => ({
    id: payment.id,
    amountDueCents: payment.amount_due_cents,
    amountPaidCents: payment.amount_paid_cents,
    currency: payment.currency ?? billingMetadata.data?.currency ?? "usd",
    status: payment.status,
    dueDate: payment.due_date,
    paidAt: payment.paid_at,
    receiptUrl: payment.receipt_url,
    description: payment.description,
    lineItems: parsePaymentLineItems(payment.line_items),
    billingPeriodStart: payment.billing_period_start,
    billingPeriodEnd: payment.billing_period_end,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground">Manage rent payments, autopay, and receipts.</p>
      </div>
      <TenantPaymentsClient
        profileName={profile.data?.full_name ?? profile.data?.email ?? user.email}
        billingMetadata={billingMetadata.data}
        payments={tenantPayments}
      />
    </div>
  );
}
