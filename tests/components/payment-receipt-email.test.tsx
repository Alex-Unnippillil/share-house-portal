import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PaymentReceiptEmail, {
  type PaymentReceiptEmailProps,
} from "@/components/emails/payment-receipt";

const fullProps: PaymentReceiptEmailProps = {
  customerName: "Avery Johnson",
  paymentId: "pi_full_98765",
  amountPaid: 1825.5,
  currency: "usd",
  paymentDate: new Date("2024-06-15T10:30:00.000Z"),
  businessName: "Roomsily",
  supportEmail: "support@roomsily.com",
  billingAddress: "Avery Johnson\n44 Innovation Way\nSeattle, WA 98109",
  notes: "Keep shining, Avery!",
  subtotalAmount: 1800,
  taxAmount: 25.5,
  discountAmount: 0,
  paymentMethodBrand: "visa",
  paymentMethodLast4: "4242",
  downloadUrl: "https://receipts.roomsily.dev/full-example.pdf",
  items: [
    {
      description: "June Rent",
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

const minimalProps: PaymentReceiptEmailProps = {
  customerName: "Kai Patel",
  paymentId: "pi_minimal_54321",
  amountPaid: 950,
  currency: "usd",
  paymentDate: new Date("2024-07-01T00:00:00.000Z"),
};

describe("PaymentReceiptEmail", () => {
  it("renders the full receipt layout with payment metadata", () => {
    const markup = renderToStaticMarkup(
      <PaymentReceiptEmail {...fullProps} />,
    );

    const formattedMarkup = markup.replace(/></g, ">\n<");

    expect(formattedMarkup).toContain("Download receipt");
    expect(formattedMarkup).toContain("Visa ending in 4242");
    expect(formattedMarkup).toMatchSnapshot();
  });

  it("renders minimal receipts without optional sections", () => {
    const markup = renderToStaticMarkup(
      <PaymentReceiptEmail {...minimalProps} />,
    );

    const formattedMarkup = markup.replace(/></g, ">\n<");

    expect(formattedMarkup).not.toContain("Download receipt");
    expect(formattedMarkup).toMatchSnapshot();
  });
});
