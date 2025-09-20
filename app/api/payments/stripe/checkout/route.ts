import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { getStripeClient } from "@/lib/stripe";

const lineItemSchema = z.object({
  priceId: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  amount: z.number().int().positive().optional(),
  currency: z.string().min(1).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

const requestSchema = z
  .object({
    priceId: z.string().min(1).optional(),
    quantity: z.number().int().positive().optional(),
    amount: z.number().int().positive().optional(),
    currency: z.string().min(1).optional(),
    productName: z.string().optional(),
    productDescription: z.string().optional(),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    customerEmail: z.string().email().optional(),
    customerId: z.string().optional(),
    mode: z.enum(["payment", "subscription"]).optional(),
    allowPromotionCodes: z.boolean().optional(),
    taxRates: z.array(z.string().min(1)).optional(),
    trialPeriodDays: z.number().int().nonnegative().optional(),
    lineItems: z.array(lineItemSchema).optional(),
  })
  .superRefine((value, ctx) => {
    const hasLineItems = Boolean(value.lineItems && value.lineItems.length > 0);
    const hasPrice = Boolean(value.priceId);
    const hasAmount = Boolean(value.amount && value.currency);

    if (!hasLineItems && !hasPrice && !hasAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "You must provide line items, a Stripe price identifier, or an amount and currency.",
        path: ["lineItems"],
      });
    }

    if (value.amount && !value.currency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Currency is required when providing an amount.",
        path: ["currency"],
      });
    }

    if (value.lineItems) {
      value.lineItems.forEach((item, index) => {
        if (!item.priceId && !(item.amount && item.currency)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Each line item must include a Stripe price identifier or an amount and currency.",
            path: ["lineItems", index],
          });
        }
      });
    }
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
    const body = await request.json();
    const payload = requestSchema.parse(body);

    const stripe = getStripeClient();
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (payload.lineItems && payload.lineItems.length > 0) {
      payload.lineItems.forEach((item) => {
        if (item.priceId) {
          lineItems.push({
            price: item.priceId,
            quantity: item.quantity ?? 1,
            tax_rates: payload.taxRates,
          });
          return;
        }

        if (item.amount && item.currency) {
          lineItems.push({
            price_data: {
              currency: item.currency,
              product_data: {
                name: item.name ?? payload.productName ?? "Custom payment",
                description: item.description ?? payload.productDescription ?? undefined,
              },
              unit_amount: item.amount,
            },
            quantity: item.quantity ?? 1,
            tax_rates: payload.taxRates,
          });
        }
      });
    } else if (payload.priceId) {
      lineItems.push({
        price: payload.priceId,
        quantity: payload.quantity ?? 1,
        tax_rates: payload.taxRates,
      });
    } else if (payload.amount && payload.currency) {
      lineItems.push({
        price_data: {
          currency: payload.currency,
          product_data: {
            name: payload.productName ?? "Custom payment",
            description: payload.productDescription ?? undefined,
          },
          unit_amount: payload.amount,
        },
        quantity: payload.quantity ?? 1,
        tax_rates: payload.taxRates,
      });
    }

    const baseUrl = resolveBaseUrl();
    const successUrl =
      payload.successUrl ?? `${baseUrl}/account/billing?status=success`;
    const cancelUrl =
      payload.cancelUrl ?? `${baseUrl}/account/billing?status=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: payload.mode ?? "payment",
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: payload.allowPromotionCodes ?? false,
      metadata: payload.metadata,
      customer_email: payload.customerEmail,
      customer: payload.customerId,
      subscription_data:
        payload.mode === "subscription" && payload.trialPeriodDays
          ? { trial_period_days: payload.trialPeriodDays }
          : undefined,
    });

    return NextResponse.json(
      { id: session.id, url: session.url, clientSecret: session.client_secret },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request payload.", issues: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error("Failed to create Stripe checkout session", error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    console.error("Failed to create Stripe checkout session", error);
    return NextResponse.json(
      { message: "Unexpected error creating checkout session." },
      { status: 500 }
    );
  }
}
