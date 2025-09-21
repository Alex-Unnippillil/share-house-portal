import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/lib/supabase";

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to export payments." }, { status: 401 });
  }

  const profile = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile.error) {
    return NextResponse.json({ error: profile.error.message }, { status: 500 });
  }

  if (!profile.data || !["property_manager", "admin"].includes(profile.data.role ?? "user")) {
    return NextResponse.json({ error: "You do not have permission to export payments." }, { status: 403 });
  }

  const payments = await supabase
    .from("rent_payments")
    .select(
      "id, amount_due_cents, amount_paid_cents, currency, status, due_date, paid_at, receipt_url, tenant:profiles(full_name, email)"
    )
    .order("created_at", { ascending: false });

  if (payments.error) {
    return NextResponse.json({ error: payments.error.message }, { status: 500 });
  }

  const rows = (payments.data ?? []).map((payment) => [
    payment.id,
    payment.tenant?.full_name ?? "",
    payment.tenant?.email ?? "",
    payment.status ?? "",
    (payment.amount_due_cents ?? 0) / 100,
    (payment.amount_paid_cents ?? 0) / 100,
    payment.currency ?? "usd",
    payment.due_date ?? "",
    payment.paid_at ?? "",
    payment.receipt_url ?? "",
  ]);

  const header = [
    "payment_id",
    "tenant_name",
    "tenant_email",
    "status",
    "amount_due",
    "amount_paid",
    "currency",
    "due_date",
    "paid_at",
    "receipt_url",
  ];

  const csv = [header, ...rows]
    .map((cols) => cols.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=rent-payments.csv",
    },
  });
}
