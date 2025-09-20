import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PaymentMethods } from "@/components/payments/payment-methods";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supa-server-actions";

export default async function BillingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <div className="mt-10 px-2 lg:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Billing &amp; payments
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage card payments through Stripe or log Interac e-Transfers for
            manual reconciliation.
          </p>
        </div>
        <Separator />
        <PaymentMethods user={user} />
      </div>
    </div>
  );
}
