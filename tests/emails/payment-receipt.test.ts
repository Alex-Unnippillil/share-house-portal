import { renderPaymentReceiptEmail } from "@/emails/payment-receipt"
import { describe, expect, it } from "vitest"

process.env.TZ = "UTC"

describe("renderPaymentReceiptEmail", () => {
  it("renders a detailed receipt with line items", async () => {
    const html = await renderPaymentReceiptEmail({
      customerName: "Jamie Tenant",
      paymentId: "pay_123456789",
      amountPaid: 1525.43,
      currency: "USD",
      paymentDate: new Date("2024-04-15T14:35:00Z"),
      businessName: "Roomsily",
      supportEmail: "support@roomsily.com",
      billingAddress: "123 Shared House Lane\nUnit B\nPortland, OR 97205",
      notes: "Thanks for keeping your account current!",
      items: [
        {
          description: "April Rent",
          quantity: 1,
          unitAmount: 1200,
          totalAmount: 1200,
        },
        {
          description: "Utilities",
          quantity: 1,
          unitAmount: 180,
          totalAmount: 180,
        },
        {
          description: "Parking Spot",
          quantity: 1,
          unitAmount: 175.43,
        },
      ],
      subtotalAmount: 1555.43,
      discountAmount: 30,
      taxAmount: 0,
    })

    expect(html).toMatchSnapshot()
  })

  it("renders minimal receipt when optional data is missing", async () => {
    const html = await renderPaymentReceiptEmail({
      customerName: "Sam Roommate",
      paymentId: "pay_987654321",
      amountPaid: 950,
      currency: "USD",
      paymentDate: new Date("2024-02-01T09:00:00Z"),
    })

    expect(html).toMatchSnapshot()
  })
})
