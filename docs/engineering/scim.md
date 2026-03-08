# SCIM Provisioning Configuration

The SCIM endpoints under `/api/scim/v2/Users` allow identity providers to
provision Share House Portal tenants directly into the Supabase `profiles`
table. Follow the steps below to configure the integration in each
environment.

## 1. Supabase access

1. Generate a **Service Role** API key from the Supabase project settings.
2. Store the values in Vercel (or your local `.env`) with the following names:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. The service role key is required because SCIM operations bypass Row Level
   Security and perform administrative CRUD operations.

## 2. Allowed roles

The SCIM implementation expects the tenant role to be provided via the custom
schema `urn:ietf:params:scim:schemas:extension:tenant:2.0:User`. Valid values
match the `profiles.role` enum: `tenant`, `roommate`, `property_manager`,
`admin`, or `user`. Requests containing other values will receive a SCIM
`invalidValue` error.

## 3. Identity provider setup

1. Point the IdP to the base URL `${APP_URL}/api/scim/v2/Users`.
2. Use HTTP Bearer authentication and issue a token with access to the SCIM
   routes (e.g. via API gateway or reverse proxy).
3. Configure pagination to send `startIndex` (1-based) and `count` query
   parameters. The API returns `Content-Range`, `X-Total-Count`, and standard
   SCIM list metadata so IdPs can paginate reliably.
4. Include `userName`, at least one email, and the tenant role extension when
   creating users. Omitting the extension keeps the existing role in update
   scenarios.

## 4. Validation

Run the automated tests after changing SCIM behaviour:

```bash
pnpm test -- tests/api/scim.test.ts
```

The suite exercises all CRUD endpoints, pagination headers, and schema
extension handling.
