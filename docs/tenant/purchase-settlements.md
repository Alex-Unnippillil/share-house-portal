# Settling Shared Supply Purchases

When a roommate fronts household supplies (cleaning products, paper goods, pantry staples, etc.) you can capture the expense in the portal and decide how everyone reimburses the buyer. The purchase settlement workflow now supports two paths depending on how quickly you want to square up.

## 1. Roll the charge into the next rent invoice

1. Open **Payments → Purchase settlements** and fill in the vendor, purchase date, total amount, and optional notes.
2. Add a line for each roommate who should repay the buyer. You can enter different amounts per person if the split is uneven.
3. Click **Add to next invoice**.
4. The portal schedules invoice adjustment rows for each roommate. They will appear on the next rent invoice with the memo you provided.
5. The shared ledger tracks the settlement in the `payments` feed with status `queued_for_invoice`, so roommates and the property manager can audit the distribution.

Use this path when the buyer is comfortable waiting until the next rent cycle to get reimbursed.

## 2. Pay the buyer back immediately with Stripe

1. From the same **Purchase settlements** section, enter the amount to pay now (defaults to the full total).
2. Click **Create Stripe PaymentIntent**. The portal creates an intent tied to the vendor, date, and notes so Stripe and the ledger both have context for the transaction.
3. Complete the payment with a saved card or copy the client secret to share with roommates if multiple people will pay from their own devices.
4. The ledger records the transaction with status `payment_intent_created`, including the Stripe intent ID for future reconciliation.

Choose this option when you want to reimburse the buyer right away without waiting for the next rent invoice.

## Tips

- You can add both invoice adjustments and a Stripe payment for the same purchase if one roommate wants to pay now and others prefer the next invoice. Each settlement creates its own ledger entry.
- Use the notes field to capture receipts, item details, or reminders (e.g., “bulk Costco paper towels – property approved”). Notes travel with both the invoice adjustments and Stripe PaymentIntent metadata.
- Need to correct a mistake? Submit a new settlement with the corrected amounts—only the most recent ledger entry will be used when the property manager finalises the invoice or payment.
