import { notFound, redirect } from "next/navigation";

import { ManagePaymentsClient } from "./components/manage-payments-client";
import { createSupbaseServerClient } from "@/utils/supaone";

export default async function ManagePaymentsPage() {
  const supabase = await createSupbaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const profile = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile.error) {
    throw new Error(profile.error.message);
  }

  if (!profile.data || !["property_manager", "admin"].includes(profile.data.role ?? "user")) {
    notFound();
  }

  const payments = await supabase
    .from("rent_payments")
    .select(
      "id, amount_due_cents, amount_paid_cents, currency, status, due_date, paid_at, receipt_url, failure_message, tenant:profiles(full_name, email)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (payments.error) {
    throw new Error(payments.error.message);
  }

  const managementPayments = (payments.data ?? []).map((payment) => ({
    id: payment.id,
    tenantName: payment.tenant?.full_name ?? payment.tenant?.email ?? "Unknown tenant",
    tenantEmail: payment.tenant?.email ?? null,
    amountDueCents: payment.amount_due_cents,
    amountPaidCents: payment.amount_paid_cents,
    currency: payment.currency ?? "usd",
    status: payment.status,
    dueDate: payment.due_date,
    paidAt: payment.paid_at,
    receiptUrl: payment.receipt_url,
    failureMessage: payment.failure_message,
  }));

  const stats = managementPayments.reduce(
    (acc, payment) => {
      acc.total += 1;
      if (payment.status === "paid") {
        acc.paid += 1;
      } else if (payment.status === "failed") {
        acc.failed += 1;
      } else {
        acc.pending += 1;
      }
      return acc;
    },
    { total: 0, paid: 0, pending: 0, failed: 0 },
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Payment management</h1>
        <p className="text-muted-foreground">
          Monitor tenant payments, retry failed charges, and export payment records.
        </p>
      </div>
      <ManagePaymentsClient payments={managementPayments} stats={stats} />
    </div>
  );
}
