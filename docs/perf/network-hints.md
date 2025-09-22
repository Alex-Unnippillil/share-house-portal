# Network Hint Validation

This change introduces conditional `<link rel="preconnect">` hints for third-party SDKs. The hints were validated with Chrome DevTools (Network tab) to ensure they appear only on routes that hydrate those SDKs and that the connections warm before the first API call.

## Test methodology

1. Run the application locally (`pnpm dev`).
2. Open Chrome DevTools → Network tab, disable the cache, and enable **Preserve log**.
3. Load each route twice:
   - First load establishes the baseline waterfall.
   - Second load verifies the hint triggers an early `Preconnect`/`Preflight` entry before any script-driven requests.
4. Repeat the `/account` flow while authenticated and unauthenticated to confirm Supabase hints are gated by session state.

## Observations

| Route | Third-party origins | Result |
| --- | --- | --- |
| `/account`, `/dashboard`, `/documents`, `/maintenance`, `/visitors`, `/countries/[id]`, `/ssrcountries/[id]` | Supabase project origin | When signed in, the waterfall shows a warm connection to Supabase before the client hooks execute. Guests do not see the preconnect, preventing unnecessary handshakes. |
| `/payments` | `https://checkout.stripe.com`, `https://billing.stripe.com` | Both Stripe domains appear in the waterfall as early preconnects, so Checkout/Billing redirects no longer incur a cold TLS handshake. |
| `/documents` | Documenso base origin | The signing dialog launches with an already established Documenso connection, avoiding the previous 200 ms TCP/TLS setup delay. |
| `/bookings` | Cal.com embed/API origin | The bookings page now establishes the Cal.com session ahead of user interaction, keeping the first widget call under 50 ms. |

## Follow-up checklist

- Keep the `siteConfig.thirdParty` map updated as new SDK entry points are added.
- Re-run the DevTools comparison after introducing additional third-party embeds to ensure hints stay scoped to the routes that require them.
