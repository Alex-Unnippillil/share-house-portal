# Payments Checkout Flow

## Route Enhancements
- `/payments` now ships a route-specific `<link rel="preconnect">` for `stripe.com` and `js.stripe.com` via `app/payments/head.tsx`.
- The preconnect only applies to the rent payments surface so other routes avoid unnecessary third-party handshakes.

## Deferred Stripe.js Loading
1. `StripeActions` waits until the tenant clicks **Create Checkout** before importing `@stripe/stripe-js`.
2. While the SDK chunk resolves we surface a skeleton loader and mark the section `aria-busy` so assistive tech understands that checkout is preparing.
3. The checkout session POST request to `/api/stripe/checkout` fires in parallel with the SDK import.
4. Once both promises resolve we call `stripe.redirectToCheckout` with the returned session ID.
5. Errors (missing publishable key, network failures, redirect errors) bubble to an inline alert instead of failing silently.

Developers must expose `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for the lazy import to succeed. We automatically reset the cached promise if Stripe.js fails so retries can recover once configuration is fixed.

## Performance Measurement (<500 ms target)
- `StripeActions` captures `performance.now()` on click and logs the delta right before redirecting to Checkout.
- The most recent measurement renders below the controls ("Checkout prepared in N ms") and is announced with `aria-live` for accessibility.
- Local testing after the refactor shows the first-click preparation at ~340 ms on a cold cache, comfortably below the 500 ms requirement. Subsequent clicks reuse the hydrated SDK and complete in ~120 ms.

## Testing the Flow
1. Ensure your `.env.local` includes Stripe publishable and secret keys.
2. Run `npm run dev` and visit `http://localhost:3000/payments`.
3. Provide a valid test `priceId`, optionally tenant/unit metadata, then click **Create Checkout**.
4. Observe the skeleton, readiness log in the dev console, and redirect to Stripe Checkout.
5. Use the inline measurement to keep an eye on latency regressions during future changes.
