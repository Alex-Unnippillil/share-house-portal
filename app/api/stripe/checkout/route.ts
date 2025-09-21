import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { getStripeClient } from "@/lib/stripe";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { createSupbaseServerClient } from "@/utils/supaone";

const payloadSchema = z.object({
  mode: z.enum(["payment", "subscription"]).default("payment"),
  amount: z.number().positive().optional(),
  currency: z.string().min(3).max(10).optional(),
  successPath: z.string().optional(),
  cancelPath: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  enableAutopay: z.boolean().optional(),
  autopayDay: z.number().int().min(1).max(28).optional(),
  priceId: z.string().optional(),
  targetProfileId: z.string().uuid().optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string().optional(),
        amount: z.number().positive().optional(),
        currency: z.string().min(3).max(10).optional(),
        quantity: z.number().int().positive().optional(),
        priceId: z.string().optional(),
      }),
    )
    .optional(),
});

async function resolveCurrentUser() {
  const supabase = await createSupbaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", authData.user.id)
    .maybeSingle();

  return { user: authData.user, profile: profile ?? null };
}

async function getOrCreateCustomer(profileId: string, email?: string | null, name?: string | null) {
  const admin = getSupabaseServiceRoleClient();
  const stripe = getStripeClient();

  const { data: existingCustomer } = await admin
    .from("stripe_customers")
    .select("id, stripe_customer_id, billing_email")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (existingCustomer?.stripe_customer_id) {
    return existingCustomer.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: name ?? undefined,
    metadata: {
      supabase_profile_id: profileId,
    },
  });

  await admin
    .from("stripe_customers")
    .insert({
      profile_id: profileId,
      stripe_customer_id: customer.id,
      billing_email: customer.email ?? email ?? null,
      metadata: customer.metadata ?? {},
    })
    .onConflict("profile_id")
    .ignore();

  return customer.id;
}

export async function POST(request: Request) {
  try {
    const [payloadResult, userContext] = await Promise.all([
      request.json().catch(() => ({})),
      resolveCurrentUser(),
    ]);

    const { user, profile } = userContext;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = payloadSchema.safeParse(payloadResult);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    const isStaff = profile?.role === "property_manager" || profile?.role === "admin";
    const profileId = payload.targetProfileId && isStaff ? payload.targetProfileId : user.id;

    if (payload.targetProfileId && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stripe = getStripeClient();
    const admin = getSupabaseServiceRoleClient();

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", profileId)
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const customerId = await getOrCreateCustomer(
      profileId,
      targetProfile.email,
      targetProfile.full_name,
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL is not configured");
    }

    const successUrl = new URL(payload.successPath ?? "/dashboard/payments?checkout=success", baseUrl);
    const cancelUrl = new URL(payload.cancelPath ?? "/dashboard/payments?checkout=cancel", baseUrl);

    const currency = (payload.currency ?? payload.lineItems?.[0]?.currency ?? "USD").toLowerCase();

    const metadata = {
      supabase_profile_id: profileId,
      initiated_by: user.id,
      checkout_mode: payload.mode,
      ...payload.metadata,
    } as Record<string, string>;

    let session;

    if (payload.mode === "subscription") {
      const priceId = payload.priceId ?? process.env.STRIPE_AUTOPAY_PRICE_ID;

      if (!priceId) {
        return NextResponse.json(
          { error: "Missing Stripe autopay price configuration" },
          { status: 500 },
        );
      }

      session = await stripe.checkout.sessions.create({
        success_url: successUrl.toString(),
        cancel_url: cancelUrl.toString(),
        customer: customerId,
        mode: "subscription",
        allow_promotion_codes: true,
        metadata,
        subscription_data: {
          metadata,
        },
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
      });

      if (typeof session.subscription === "string") {
        await stripe.subscriptions.update(session.subscription, {
          metadata: {
            ...metadata,
            checkout_session_id: session.id,
          },
        });
      }

      await admin
        .from("tenant_billing_settings")
        .upsert(
          {
            profile_id: profileId,
            autopay_enabled: false,
            autopay_day: payload.autopayDay ?? null,
            currency: currency.toUpperCase(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "profile_id" },
        );
    } else {
      let amount = payload.amount;
      const lineItems = [] as Stripe.Checkout.SessionCreateParams.LineItem[];

      if (payload.lineItems?.length) {
        payload.lineItems.forEach((item) => {
          if (item.priceId) {
            lineItems.push({ price: item.priceId, quantity: item.quantity ?? 1 });
          } else if (item.amount) {
            lineItems.push({
              quantity: item.quantity ?? 1,
              price_data: {
                currency: (item.currency ?? currency).toLowerCase(),
                product_data: {
                  name: item.description ?? "Rent payment",
                },
                unit_amount: Math.round(item.amount * 100),
              },
            });
          }
        });
      }

      if (!lineItems.length) {
        if (!amount) {
          return NextResponse.json(
            { error: "Amount is required for one-time payments" },
            { status: 400 },
          );
        }

        lineItems.push({
          quantity: 1,
          price_data: {
            currency,
            product_data: {
              name: "Rent payment",
            },
            unit_amount: Math.round(amount * 100),
          },
        });
      } else if (!amount) {
        amount = lineItems.reduce((sum, item) => {
          if (item.price_data?.unit_amount) {
            return sum + (item.price_data.unit_amount / 100) * (item.quantity ?? 1);
          }
          return sum;
        }, 0);
      }

      session = await stripe.checkout.sessions.create({
        success_url: successUrl.toString(),
        cancel_url: cancelUrl.toString(),
        customer: customerId,
        mode: "payment",
        allow_promotion_codes: true,
        metadata,
        line_items: lineItems,
        payment_intent_data: {
          metadata,
        },
      });

      if (typeof session.payment_intent === "string") {
        await stripe.paymentIntents.update(session.payment_intent, {
          metadata: {
            ...metadata,
            checkout_session_id: session.id,
          },
        });
      }

      await admin.from("rent_payments").insert({
        profile_id: profileId,
        status: "pending",
        amount: amount ?? 0,
        currency: currency.toUpperCase(),
        stripe_checkout_session_id: session.id,
        metadata: {
          ...metadata,
          checkout_session_id: session.id,
        },
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
