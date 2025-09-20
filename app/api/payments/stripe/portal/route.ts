import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripeClient } from "@/lib/stripe";

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

    const stripe = getStripeClient();
    let customerId = payload.customerId ?? null;

    if (!customerId && payload.customerEmail) {
      const existingCustomers = await stripe.customers.list({
        email: payload.customerEmail,
        limit: 1,
      });

      customerId = existingCustomers.data[0]?.id ?? null;
    }

    if (!customerId) {
      return NextResponse.json(
        { message: "A Stripe customer id or email is required." },
        { status: 400 }
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
