import type { Database } from '@/lib/supabase';

type RentInvoice = Database['public']['Tables']['rent_invoices']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

const toNumber = (value: number | string | null | undefined): number => {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sumInvoices = (invoices: RentInvoice[]): number =>
  invoices.reduce((total, invoice) => total + toNumber(invoice.amount_due), 0);

export const sumPaymentsForInvoices = (
  payments: Payment[],
  invoiceIds?: string[],
): number => {
  const ids = invoiceIds?.length ? new Set(invoiceIds) : null;
  return payments.reduce((total, payment) => {
    if (ids && payment.invoice_id && !ids.has(payment.invoice_id)) {
      return total;
    }
    return total + toNumber(payment.amount_paid);
  }, 0);
};

export const calculateOutstandingBalance = (
  invoices: RentInvoice[],
  payments: Payment[],
): number => {
  const relevantInvoiceIds = invoices.map((invoice) => invoice.id);
  const invoiceTotal = sumInvoices(invoices);
  const paymentsTotal = sumPaymentsForInvoices(payments, relevantInvoiceIds);
  const balance = invoiceTotal - paymentsTotal;
  return Math.round(balance * 100) / 100;
};

export const formatCurrency = (amount: number, currency = 'usd'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch (error) {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
};
