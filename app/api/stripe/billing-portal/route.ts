import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/lib/supabase";
import { getStripeClient } from "@/lib/stripe/server";
import { getStripeBillingPortalReturnUrl } from "@/lib/env";
import { ensureStripeCustomer } from "@/lib/payments/customer";

const portalPayloadSchema = z.object({
  tenantId: z.string().uuid().optional(),
  returnUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to manage billing." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = portalPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const tenantId = data.tenantId ?? user.id;
  const stripe = getStripeClient();

  const requesterProfile = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (requesterProfile.error) {
    return NextResponse.json({ error: requesterProfile.error.message }, { status: 500 });
  }

  const requesterRole = requesterProfile.data?.role ?? "user";

  if (tenantId !== user.id && !["property_manager", "admin"].includes(requesterRole)) {
    return NextResponse.json({ error: "You are not allowed to access this billing portal." }, { status: 403 });
  }

  const tenantProfile = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantProfile.error) {
    return NextResponse.json({ error: tenantProfile.error.message }, { status: 500 });
  }

  if (!tenantProfile.data) {
    return NextResponse.json({ error: "Tenant profile not found." }, { status: 404 });
  }

  let stripeCustomerId: string;

  try {
    const ensured = await ensureStripeCustomer({
      supabase,
      stripe,
      tenantId,
      email: tenantProfile.data.email ?? requesterProfile.data?.email ?? user.email ?? undefined,
      name: tenantProfile.data.full_name ?? undefined,
    });
    stripeCustomerId = ensured.customerId;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create Stripe customer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: data.returnUrl ?? getStripeBillingPortalReturnUrl(),
  });

  return NextResponse.json({ url: session.url });
}
