import PaymentReceiptEmail from "@/components/emails/payment-receipt";
import type { PaymentReceiptEmailProps } from "@/components/emails/payment-receipt";

const previewProps: PaymentReceiptEmailProps = {
  customerName: "Jordan Rivers",
  paymentId: "pi_preview_12345",
  amountPaid: 1825.5,
  currency: "usd",
  paymentDate: new Date("2024-06-15T10:30:00.000Z"),
  businessName: "Roomsily",
  supportEmail: "support@roomsily.com",
  billingAddress: "Jordan Rivers\n22 Baker Street\nSan Francisco, CA 94107",
  notes: "Thanks for staying on top of your rent payments!",
  subtotalAmount: 1800,
  taxAmount: 25.5,
  paymentMethodBrand: "visa",
  paymentMethodLast4: "4242",
  downloadUrl: "https://receipts.roomsily.dev/preview-payment.pdf",
  items: [
    {
      description: "Monthly Rent",
      quantity: 1,
      unitAmount: 1750,
      totalAmount: 1750,
    },
    {
      description: "Utilities",
      quantity: 1,
      unitAmount: 75.5,
      totalAmount: 75.5,
    },
  ],
};

export default function PaymentReceiptEmailPreviewPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <PaymentReceiptEmail {...previewProps} />
    </div>
  );
}
