import type Stripe from 'stripe';

import type { PaymentReceiptEmailProps } from '@/components/emails/payment-receipt';

const centsToCurrency = (amount?: number | null): number =>
  amount != null ? Math.round(amount) / 100 : 0;

const getChargeCustomerEmail = (charge: Stripe.Charge): string | null => {
  if (charge.billing_details?.email) return charge.billing_details.email;
  if (charge.receipt_email) return charge.receipt_email;
  if (charge.customer && typeof charge.customer !== 'string') {
    return charge.customer.email ?? null;
  }
  return null;
};

const getChargeCustomerName = (charge: Stripe.Charge): string | null => {
  if (charge.billing_details?.name) return charge.billing_details.name;
  if (charge.customer && typeof charge.customer !== 'string') {
    return charge.customer.name ?? null;
  }
  return null;
};

const invoiceLineItems = (invoice?: Stripe.Invoice | null) => {
  if (!invoice?.lines?.data?.length) return [] as PaymentReceiptEmailProps['items'];
  return invoice.lines.data.map((line) => ({
    description:
      line.description ??
      (line.price && typeof line.price !== 'string' ? line.price.nickname ?? 'Rent payment' : 'Rent payment'),
    quantity: line.quantity ?? undefined,
    unitAmount: (() => {
      const quantity = line.quantity ?? 1;
      if (line.price && typeof line.price !== 'string' && line.price.unit_amount != null) {
        return centsToCurrency(line.price.unit_amount);
      }
      const divisor = quantity > 0 ? quantity : 1;
      return centsToCurrency(line.amount / divisor);
    })(),
    totalAmount: centsToCurrency(line.amount),
  }));
};

export type ReceiptContext = {
  charge: Stripe.Charge;
  invoice?: Stripe.Invoice | null;
};

export type StripeReceiptPayload = PaymentReceiptEmailProps & { customerEmail: string };

export const buildReceiptPayload = (
  context: ReceiptContext,
): StripeReceiptPayload => {
  const { charge, invoice } = context;
  const customerName = getChargeCustomerName(charge) ?? 'Tenant';
  const customerEmail = getChargeCustomerEmail(charge);
  if (!customerEmail) {
    throw new Error('Unable to determine customer email for Stripe charge');
  }

  const amount = centsToCurrency(charge.amount_captured ?? charge.amount);
  const subtotal = invoice?.subtotal ? centsToCurrency(invoice.subtotal) : undefined;
  const tax = invoice?.tax ? centsToCurrency(invoice.tax) : undefined;
  const discount = (invoice?.total_discount_amounts ?? []).reduce(
    (total, discountAmount) => total + centsToCurrency(discountAmount.amount),
    0,
  );

  return {
    customerEmail,
    customerName,
    paymentId: charge.id,
    amountPaid: amount,
    currency: charge.currency?.toUpperCase() ?? 'USD',
    paymentDate: new Date((charge.created ?? Date.now()) * 1000),
    items: invoiceLineItems(invoice),
    subtotalAmount: subtotal,
    taxAmount: tax,
    discountAmount: discount > 0 ? discount : undefined,
  };
};
