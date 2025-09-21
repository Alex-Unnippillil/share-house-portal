import { redirect } from "next/navigation";

import type { Database } from "@/lib/supabase";
import { createSupbaseServerClient } from "@/utils/supaone";
import ManagementPaymentsClient from "./payments-management-client";

export default async function PaymentsManagementPage() {
  const supabase = await createSupbaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "tenant";

  if (!role || (role !== "property_manager" && role !== "admin")) {
    redirect("/dashboard/payments");
  }

  const { data: payments } = await supabase
    .from("rent_payments")
    .select(
      "*, profiles:profiles(full_name, email, role), tenant_settings:tenant_billing_settings(rent_amount, currency)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <ManagementPaymentsClient
        payments={(payments as (Database["public"]["Tables"]["rent_payments"]["Row"] & {
          profiles: Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name" | "email" | "role"> | null;
          tenant_settings: Pick<
            Database["public"]["Tables"]["tenant_billing_settings"]["Row"],
            "rent_amount" | "currency"
          > | null;
        })[]) ?? []}
        viewerRole={role}
      />
    </div>
  );
}
