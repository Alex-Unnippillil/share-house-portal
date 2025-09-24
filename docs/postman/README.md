# Share House Portal Postman Collection

## Two-minute quick start

1. **Copy the sample environment** – Choose either [`env/development.postman_environment.json`](env/development.postman_environment.json) or [`env/staging.postman_environment.json`](env/staging.postman_environment.json) and duplicate it so you can keep your secrets out of version control. Update the Supabase and Stripe placeholder values with the keys for your workspace.
2. **Adjust the base URL** – Point `base_url` to the running app (`http://localhost:3000` for `pnpm dev`, your preview deployment, or a tunnel such as `https://sharehouse.ngrok.app`). Keep `app_redirect` aligned with an on-app route that can complete the OAuth handshake.
3. **Import into Postman** – In the Postman app, click *Import → Upload Files* and select both the [`share-house.postman_collection.json`](share-house.postman_collection.json) file and your tailored environment JSON. Activate the environment in the upper-right dropdown.
4. **Send a request** – Start with the **Authentication → Start Google OAuth login** request to confirm Supabase credentials, then explore **Documents**, **Notifications**, and **Payments** to validate the mocked resources, metadata, and zod validation paths.

> ⏱️ Following the four steps above should take about two minutes once your Supabase and Stripe credentials are nearby.

## Environment setup tips

- The collection variables mirror the API route expectations in `app/api`. If you add new environment values, prefer lower-case with underscores so they map cleanly to the Next.js route query/body payloads.
- For Supabase, ensure the service role key you paste into the environment is scoped to a non-production project. These calls execute privileged operations (e.g., inserting rent payments from the Stripe webhook handler) when run outside mocked data.
- For Stripe, create separate test mode API keys and webhook secrets per environment. The Checkout request relies on `stripe_price_id` while the Billing Portal flow needs a valid `stripe_customer_id`.
- When testing the `notifications` routes locally, sign in via the web app first so the Supabase session cookie is available to Postman. Otherwise the GET will return a 401.

## Curl alternatives

Prefer the terminal? Export the environment variables and run the same flows without Postman:

```bash
export BASE_URL="http://localhost:3000"
export TENANT_ID="00000000-0000-0000-0000-000000000000"
export STRIPE_PRICE_ID="price_12345"
export STRIPE_CUSTOMER_ID="cus_DEV12345"
```

Fetch tenant documents with a specific revision:

```bash
curl --request GET "${BASE_URL}/api/documents?revision=current" \
  --header "Accept: application/json"
```

Send an in-app notification payload:

```bash
curl --request POST "${BASE_URL}/api/notifications" \
  --header "Content-Type: application/json" \
  --data '{
    "type": "in-app",
    "notification": {
      "userId": "'"${TENANT_ID}"'",
      "title": "Maintenance scheduled",
      "message": "Your AC repair is booked for tomorrow at 10am.",
      "type": "info",
      "actionUrl": "/maintenance"
    }
  }'
```

Create a Stripe Checkout session for a one-time payment:

```bash
curl --request POST "${BASE_URL}/api/stripe/checkout" \
  --header "Content-Type: application/json" \
  --data '{
    "priceId": "'"${STRIPE_PRICE_ID}"'",
    "quantity": 1,
    "mode": "payment",
    "metadata": {
      "tenant_id": "'"${TENANT_ID}"'",
      "unit_id": "unit-1",
      "memo": "July rent"
    }
  }'
```

Generate a Stripe Billing Portal session so tenants can manage saved payment methods:

```bash
curl --request POST "${BASE_URL}/api/stripe/billing-portal" \
  --header "Content-Type: application/json" \
  --data '{
    "customerId": "'"${STRIPE_CUSTOMER_ID}"'"
  }'
```

These commands map 1:1 with the Postman requests, making it easy to drop them into CI smoke tests or bash scripts.
