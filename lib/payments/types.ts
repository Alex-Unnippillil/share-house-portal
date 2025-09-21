import type { Database } from "@/lib/supabase";

export type RentPaymentRow = Database["public"]["Tables"]["rent_payments"]["Row"];
export type RentPaymentInsert = Database["public"]["Tables"]["rent_payments"]["Insert"];
export type RentPaymentUpdate = Database["public"]["Tables"]["rent_payments"]["Update"];

export type StripeCustomerRow = Database["public"]["Tables"]["stripe_customers"]["Row"];
export type StripeCustomerInsert = Database["public"]["Tables"]["stripe_customers"]["Insert"];
export type StripeCustomerUpdate = Database["public"]["Tables"]["stripe_customers"]["Update"];

export type TenantBillingMetadataRow = Database["public"]["Tables"]["tenant_billing_metadata"]["Row"];
export type TenantBillingMetadataInsert = Database["public"]["Tables"]["tenant_billing_metadata"]["Insert"];
export type TenantBillingMetadataUpdate = Database["public"]["Tables"]["tenant_billing_metadata"]["Update"];

export interface PaymentLineItem {
  description: string;
  quantity?: number | null;
  unit_amount?: number | null;
  total?: number | null;
  interval?: string | null;
}

export function parsePaymentLineItems(lineItems: unknown): PaymentLineItem[] {
  if (!Array.isArray(lineItems)) {
    return [];
  }

  return lineItems
    .map((item) => {
      if (!item || typeof item !== "object") {
        return undefined;
      }

      const { description, quantity, unit_amount, total, interval } = item as Record<string, unknown>;

      if (typeof description !== "string" || description.length === 0) {
        return undefined;
      }

      return {
        description,
        quantity: typeof quantity === "number" ? quantity : null,
        unit_amount: typeof unit_amount === "number" ? unit_amount : null,
        total: typeof total === "number" ? total : null,
        interval: typeof interval === "string" ? interval : null,
      } satisfies PaymentLineItem;
    })
    .filter((item): item is PaymentLineItem => Boolean(item));
}
