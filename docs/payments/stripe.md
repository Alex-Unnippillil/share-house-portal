# Stripe payments configuration

This runbook tracks how we configure Stripe to power rent payments in Canada. It covers dashboard setup, PAD mandate controls, and the environment flags that expose supported payment methods to the product.

## Enable payment methods in the Stripe Dashboard

All changes happen in the live mode dashboard unless we specifically call out test mode. You need the `Administrator` or `Developer` role to adjust payment method availability.

### Card payments
1. Sign in to the Stripe Dashboard and navigate to **Settings → Payments → Payment methods**.
2. In the **Cards** row, click **Turn on** (or **Manage** → **Activate** if the capability is pending). Stripe may prompt for additional business verification—complete any required steps so the capability shows as **Live**.
3. Repeat these steps in test mode to keep sandbox behaviour aligned with production.

### ACSS Pre-Authorized Debits (PAD)
1. Staying on the **Payment methods** screen, locate **Bank debits → ACSS** and choose **Turn on**.
2. Provide the additional information Stripe requests (bank account details, support contact, or refund policies). Submit the form and wait for the capability to transition to **Live**.
3. Enable ACSS PAD in test mode as well so QA can exercise mandate acceptance without touching production data.

> ℹ️ **Interac e-Transfer is not available through Stripe.** Leave the Interac e-Transfer toggle off—Stripe does not process those payments and they are out of scope for the Share House Portal.

## PAD mandate flow checklist
- Confirm that **Automatic email notifications** are enabled under **Settings → Billing → Subscriptions and emails** so Stripe sends the PAD mandate to renters immediately after payment method collection.
- Stripe hosts the mandate confirmation page; customise the business name and contact details under **Settings → Branding** so the tenant sees the correct entity and support channel.
- Download and archive the sample mandate from **Customers → [Tenant] → Payments** after a test collection. Keep the PDF for compliance sign-off before launching PAD in production.

Refer to Stripe's ACSS documentation for mandate timing, cancellation windows, and dispute handling requirements.

## Environment capability flags
The app reads payment-method availability from environment variables and surfaces them through `config/stripe.ts`:

```env
NEXT_PUBLIC_STRIPE_CARD_PAYMENTS_ENABLED=true
NEXT_PUBLIC_STRIPE_ACSS_DEBIT_ENABLED=true
```

Set each flag to `true` or `false` in every deployment environment (local `.env`, Vercel project settings, etc.). The values flow into `stripeConfig.capabilities` so UI flows can dynamically show or hide payment options without additional deploys.

## Further Stripe resources
- [Enable payment methods in the Dashboard](https://stripe.com/docs/stripe-dashboard/onboarding/enable-payment-methods)
- [Accept a card payment](https://stripe.com/docs/payments/accept-a-payment?platform=web&ui=elements)
- [ACSS debit overview and mandates](https://stripe.com/docs/payments/acss-debit)
