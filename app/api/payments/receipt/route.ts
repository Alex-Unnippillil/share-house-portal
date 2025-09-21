import {
  PaymentReceiptEmail,
  type PaymentReceiptLineItem,
} from "@/components/emails/payment-receipt";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { Database } from "@/lib/supabase";
import { Resend } from "resend";
import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1, "Line item description is required."),
  quantity: z.number().positive().optional(),
  unitAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative().optional(),
});

const paymentReceiptSchema = z.object({
  rentPaymentId: z.string().uuid().optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  paymentId: z.string().optional(),
  amountPaid: z.number().positive().optional(),
  currency: z.string().min(3).max(10).optional(),
  paymentDate: z.coerce.date().optional(),
  items: z.array(lineItemSchema).optional(),
  businessName: z.string().optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
  subtotalAmount: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  propertyName: z.string().optional(),
  unitLabel: z.string().optional(),
  paymentMethod: z.string().optional(),
  managerName: z.string().optional(),
  sendCopyTo: z.array(z.string().email()).optional(),
});

type RentPaymentRow = Database["public"]["Tables"]["rent_payments"]["Row"];

const toLineItem = (payment: RentPaymentRow): { description: string; totalAmount: number } => ({
  description:
    (payment.metadata as Record<string, unknown> | null)?.description?.toString() ?? "Monthly rent",
  totalAmount: Number(payment.amount ?? 0),
});

const normalizeLineItems = (
  items: unknown,
  fallback: PaymentReceiptLineItem[],
) => {
  if (!Array.isArray(items)) {
    return fallback;
  }

  const parsed = items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const { description, quantity, unitAmount, totalAmount } = item as Record<string, unknown>;

      if (typeof description !== "string" || !description) {
        return null;
      }

      return {
        description,
        quantity: typeof quantity === "number" ? quantity : undefined,
        unitAmount: typeof unitAmount === "number" ? unitAmount : undefined,
        totalAmount: typeof totalAmount === "number" ? totalAmount : undefined,
      } satisfies PaymentReceiptLineItem;
    })
    .filter((value): value is PaymentReceiptLineItem => Boolean(value));

  return parsed.length ? parsed : fallback;
};

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return Response.json(
      { error: "Resend API key is not configured." },
      { status: 500 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return Response.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const parsed = paymentReceiptSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid payment receipt payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const admin = getSupabaseServiceRoleClient();

  let payment: RentPaymentRow | null = null;
  let profile: { full_name: string | null; email: string | null } | null = null;
  let billingSettings:
    | Database["public"]["Tables"]["tenant_billing_settings"]["Row"]
    | null = null;

  if (parsed.data.rentPaymentId) {
    const { data: paymentRow } = await admin
      .from("rent_payments")
      .select("*")
      .eq("id", parsed.data.rentPaymentId)
      .maybeSingle();

    if (!paymentRow) {
      return Response.json({ error: "Payment not found" }, { status: 404 });
    }

    payment = paymentRow;

    const [{ data: profileRow }, { data: settingsRow }] = await Promise.all([
      admin
        .from("profiles")
        .select("full_name,email")
        .eq("id", paymentRow.profile_id)
        .maybeSingle(),
      admin
        .from("tenant_billing_settings")
        .select("*")
        .eq("profile_id", paymentRow.profile_id)
        .maybeSingle(),
    ]);

    profile = profileRow ?? null;
    billingSettings = settingsRow ?? null;
  }

  const metadata = (payment?.metadata as Record<string, unknown> | null) ?? {};
  const billingSettingsMetadata =
    (billingSettings?.metadata as Record<string, unknown> | null) ?? {};

  const businessName =
    parsed.data.businessName ?? process.env.PAYMENTS_BUSINESS_NAME ?? "Share House Portal";

  const customerEmail = parsed.data.customerEmail ?? profile?.email ?? undefined;

  if (!customerEmail) {
    return Response.json(
      { error: "Customer email is required to send the receipt." },
      { status: 400 },
    );
  }

  const customerName = parsed.data.customerName ?? profile?.full_name ?? "Resident";

  const amountPaid =
    parsed.data.amountPaid ?? (payment ? Number(payment.amount ?? 0) : undefined);

  if (!amountPaid || Number.isNaN(amountPaid)) {
    return Response.json(
      { error: "Unable to determine payment amount for the receipt." },
      { status: 400 },
    );
  }

  const currency = (
    parsed.data.currency ??
    payment?.currency ??
    billingSettings?.currency ??
    (metadata.currency as string | undefined) ??
    "USD"
  ).toUpperCase();

  const paymentId =
    parsed.data.paymentId ??
    payment?.stripe_payment_intent_id ??
    payment?.id ??
    `payment-${Date.now()}`;

  const paymentDate =
    parsed.data.paymentDate ??
    (payment?.paid_at ? new Date(payment.paid_at) : payment?.created_at ? new Date(payment.created_at) : new Date());

  const fallbackItems = payment ? [toLineItem(payment)] : [];
  const metadataItems = normalizeLineItems((metadata as Record<string, unknown>).line_items, fallbackItems);
  const items = parsed.data.items ?? metadataItems;

  const supportEmail =
    parsed.data.supportEmail ?? process.env.PAYMENTS_SUPPORT_EMAIL ?? undefined;

  const supportPhone =
    parsed.data.supportPhone ?? process.env.PAYMENTS_SUPPORT_PHONE ?? undefined;

  const billingAddress =
    parsed.data.billingAddress ??
    (metadata.billing_address as string | undefined) ??
    (typeof billingSettingsMetadata.billing_address === "string"
      ? billingSettingsMetadata.billing_address
      : undefined);

  const notes = parsed.data.notes ?? (metadata.notes as string | undefined) ?? undefined;

  const subtotalAmount =
    parsed.data.subtotalAmount ??
    (typeof metadata.subtotal_amount === "number" ? metadata.subtotal_amount : undefined);

  const taxAmount =
    parsed.data.taxAmount ??
    (typeof metadata.tax_amount === "number" ? metadata.tax_amount : undefined);

  const discountAmount =
    parsed.data.discountAmount ??
    (typeof metadata.discount_amount === "number" ? metadata.discount_amount : undefined);

  const propertyName =
    parsed.data.propertyName ?? (metadata.property_name as string | undefined) ?? undefined;

  const unitLabel = parsed.data.unitLabel ?? (metadata.unit_label as string | undefined) ?? undefined;

  const paymentMethod =
    parsed.data.paymentMethod ??
    (metadata.payment_method as string | undefined) ??
    (metadata.payment_method_brand && metadata.payment_method_last4
      ? `${metadata.payment_method_brand} •••• ${metadata.payment_method_last4}`
      : undefined);

  const managerName =
    parsed.data.managerName ?? (metadata.manager_name as string | undefined) ?? undefined;

  const billingPeriodStart =
    parsed.data.billingPeriodStart ??
    payment?.billing_period_start ??
    (metadata.billing_period_start as string | undefined) ??
    null;

  const billingPeriodEnd =
    parsed.data.billingPeriodEnd ??
    payment?.billing_period_end ??
    (metadata.billing_period_end as string | undefined) ??
    null;

  const sendCopyTo = parsed.data.sendCopyTo ?? [];

  const resend = new Resend(resendApiKey);

  const fromAddress = process.env.RESEND_RECEIPTS_FROM ?? 'Onyx Receipts <receipts@resend.dev>';
  const emailRecipients = [customerEmail, ...(sendCopyTo ?? [])];

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: emailRecipients,
      subject: `Receipt for payment ${paymentId}`,
      react: PaymentReceiptEmail({
        customerName,
        paymentId,
        amountPaid,
        currency,
        paymentDate,
        items,
        businessName,
        supportEmail,
        supportPhone,
        billingAddress,
        notes,
        subtotalAmount,
        taxAmount,
        discountAmount,
        propertyName,
        unitLabel,
        paymentMethod,
        billingPeriodStart,
        billingPeriodEnd,
        managerName,
      }),
    });

    if (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ error: message }, { status: 502 });
    }

    if (payment) {
      await admin
        .from("rent_payments")
        .update({
          metadata: {
            ...metadata,
            receipt_last_sent_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
    }

    return Response.json({ id: data?.id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
