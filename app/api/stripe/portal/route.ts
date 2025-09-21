import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripeClient } from "@/lib/stripe";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { createSupbaseServerClient } from "@/utils/supaone";

const schema = z.object({
  returnPath: z.string().optional(),
  targetProfileId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await createSupbaseServerClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", authData.user.id)
      .maybeSingle();

    const isStaff = profile?.role === "property_manager" || profile?.role === "admin";
    const profileId = parsed.data.targetProfileId && isStaff ? parsed.data.targetProfileId : authData.user.id;

    if (parsed.data.targetProfileId && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = getSupabaseServiceRoleClient();

    const { data: customerRecord } = await admin
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!customerRecord?.stripe_customer_id) {
      return NextResponse.json({ error: "Stripe customer not found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL is not configured");
    }

    const returnUrl = new URL(parsed.data.returnPath ?? "/dashboard/payments", baseUrl);

    const stripe = getStripeClient();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerRecord.stripe_customer_id,
      return_url: returnUrl.toString(),
    });

    await admin
      .from("tenant_billing_settings")
      .upsert(
        {
          profile_id: profileId,
          billing_portal_url: portalSession.url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" },
      );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Stripe portal error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
