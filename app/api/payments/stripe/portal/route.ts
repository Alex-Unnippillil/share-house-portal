import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getStripeClient } from "@/lib/stripe";
import type { Database } from "@/lib/supabase";

function resolveStripeCustomerId(metadata?: Record<string, unknown>) {
  const id =
    metadata?.["stripe_customer_id"] ?? metadata?.["stripeCustomerId"];

  return typeof id === "string" && id.trim().length > 0 ? id : undefined;
}

const requestSchema = z.object({
  customerId: z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
  returnUrl: z.string().url().optional(),
});

function resolveBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  );
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = requestSchema.parse(json);

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({
      cookies: () => cookieStore,
    });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Failed to retrieve authenticated user", userError);
      return NextResponse.json(
        { message: "Unable to verify authentication." },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { message: "You must be signed in to manage billing." },
        { status: 401 }
      );
    }

    const userMetadata = user.user_metadata as Record<string, unknown> | undefined;
    const appMetadata = user.app_metadata as Record<string, unknown> | undefined;
    const stripeCustomerIdFromUser =
      resolveStripeCustomerId(userMetadata) ?? resolveStripeCustomerId(appMetadata);
    const normalizedUserEmail =
      typeof user.email === "string" ? user.email.toLowerCase() : undefined;

    if (payload.customerId) {
      if (!stripeCustomerIdFromUser || payload.customerId !== stripeCustomerIdFromUser) {
        return NextResponse.json(
          { message: "The requested Stripe customer does not match your account." },
          { status: 403 }
        );
      }
    }

    if (payload.customerEmail) {
      if (
        !normalizedUserEmail ||
        payload.customerEmail.toLowerCase() !== normalizedUserEmail
      ) {
        return NextResponse.json(
          { message: "The requested Stripe customer does not match your account." },
          { status: 403 }
        );
      }
    }

    const stripe = getStripeClient();
    let customerId = stripeCustomerIdFromUser ?? null;

    if (!customerId && payload.customerId) {
      customerId = payload.customerId;
    }

    if (!customerId && normalizedUserEmail) {
      const existingCustomers = await stripe.customers.list({
        email: normalizedUserEmail,
        limit: 1,
      });

      customerId = existingCustomers.data[0]?.id ?? null;
    }

    if (!customerId) {
      return NextResponse.json(
        { message: "No Stripe customer is associated with your account." },
        { status: 404 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: payload.returnUrl ?? `${resolveBaseUrl()}/account/billing`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request payload.", issues: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error("Failed to create Stripe billing portal session", error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    console.error("Failed to create Stripe billing portal session", error);
    return NextResponse.json(
      { message: "Unexpected error creating billing portal session." },
      { status: 500 }
    );
  }
}
