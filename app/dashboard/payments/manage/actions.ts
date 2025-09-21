"use server";

import { revalidatePath } from "next/cache";

import { getStripeClient } from "@/lib/stripe/server";
import { createSupbaseServerClient } from "@/utils/supaone";
import { getServiceRoleSupabase } from "@/utils/supabase/service-role-client";

export async function retryPayment(paymentId: string) {
  if (!paymentId) {
    throw new Error("Payment ID is required.");
  }

  const supabase = await createSupbaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to retry payments.");
  }

  const profile = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile.error) {
    throw new Error(profile.error.message);
  }

  if (!profile.data || !["property_manager", "admin"].includes(profile.data.role ?? "user")) {
    throw new Error("You do not have permission to retry payments.");
  }

  const serviceSupabase = getServiceRoleSupabase();
  const payment = await serviceSupabase
    .from("rent_payments")
    .select("id, stripe_invoice_id, stripe_payment_intent_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (payment.error) {
    throw new Error(payment.error.message);
  }

  if (!payment.data) {
    throw new Error("Rent payment not found.");
  }

  const stripe = getStripeClient();

  if (payment.data.stripe_invoice_id) {
    await stripe.invoices.pay(payment.data.stripe_invoice_id, { retry: true });
  } else if (payment.data.stripe_payment_intent_id) {
    await stripe.paymentIntents.confirm(payment.data.stripe_payment_intent_id);
  } else {
    throw new Error("Payment does not have Stripe identifiers available for retry.");
  }

  const { error: updateError } = await serviceSupabase
    .from("rent_payments")
    .update({ status: "processing", failure_code: null, failure_message: null })
    .eq("id", paymentId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/dashboard/payments/manage");
}
