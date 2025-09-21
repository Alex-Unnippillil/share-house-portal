import { redirect } from "next/navigation";

import { createSupbaseServerClient } from "@/utils/supaone";
import TenantPaymentsClient from "./tenant-payments-client";
import type { Database } from "@/lib/supabase";

export default async function PaymentsPage() {
  const supabase = await createSupbaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const [{ data: profile }, { data: payments }, { data: settings }, { data: customer }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("rent_payments")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("tenant_billing_settings").select("*").eq("profile_id", user.id).maybeSingle(),
      supabase.from("stripe_customers").select("*").eq("profile_id", user.id).maybeSingle(),
    ]);

  return (
    <div className="space-y-6">
      <TenantPaymentsClient
        payments={(payments as Database["public"]["Tables"]["rent_payments"]["Row"][]) ?? []}
        settings={(settings as Database["public"]["Tables"]["tenant_billing_settings"]["Row"] | null) ?? null}
        stripeCustomer={(customer as Database["public"]["Tables"]["stripe_customers"]["Row"] | null) ?? null}
        profile={(profile as Database["public"]["Tables"]["profiles"]["Row"] | null) ?? null}
      />
    </div>
  );
}
