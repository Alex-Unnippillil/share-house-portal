# Custom Domain DNS Checklist

Roomsily supports branded domains so that co-living tenants land on a familiar URL while our admin
team maintains HTTPS certificates behind the scenes. Follow the steps below whenever a property wants
to connect their own hostname.

## 1. Capture the request

1. Collect the exact hostname from the property manager (for example, `portal.sunsetlofts.com`).
2. Open the **Dashboard → Domains** screen and submit the domain through the onboarding form.
3. If Vercel credentials are configured, the form will call the Vercel Domains API and store the
   returned CNAME targets. Otherwise, Roomsily records placeholder guidance so you can proceed
   manually.

## 2. Create required DNS records

| Purpose                 | Record Type | Host / Name        | Target / Value                         | TTL (seconds) |
| ----------------------- | ----------- | ------------------ | -------------------------------------- | ------------- |
| Web traffic             | CNAME       | `www` or tenant host | Vercel-provided `*.cname.vercel-dns.com` | 300           |
| ACME certificate challenge | CNAME    | `_acme-challenge`  | `*.acm.vercel-dns.com` (per-domain slug) | 300           |

* Some registrars require the host without the apex (e.g. enter `_acme-challenge` instead of
  `_acme-challenge.example.com`).
* Keep the TTL at `300` or lower until verification succeeds to make retries faster.

## 3. Verify ownership

1. Wait for DNS to propagate. You can use tools like `dig` or <https://www.whatsmydns.net/> to confirm
   the new CNAME values resolve globally.
2. Back in the Domains dashboard, click **Verify DNS**. Roomsily will call Vercel when available and
   update the verification status plus certificate metadata in Supabase.
3. If automation is not configured yet, the UI will continue to show “Manual DNS required”; records
   remain stored for reference and can be verified again later.

## 4. Track certificate renewals

* Once a certificate is issued, click **Schedule renewal** so Roomsily logs the upcoming attempt for
  admins.
* The system automatically stores `certificate_expires_at`, a suggested `renewal_scheduled_for` date
  (14 days before expiry by default), and creates a timeline entry in `domain_certificate_events`.
* Renewal events trigger in-app notifications to admins when Vercel credentials are present; otherwise
  the logs serve as manual reminders.

## 5. Operational notes

* All custom domain records live in the Supabase `custom_domains` table with DNS details persisted in
  the `dns_records` JSON column.
* Status changes and failures append to `domain_certificate_events` so the dashboard can render a
  timeline for property stakeholders.
* When updating Vercel credentials, revisit the Domains dashboard and run **Verify DNS** once more to
  switch existing fallback entries into automated mode.
* If you need to remove a domain, delete the row from `custom_domains` and revoke the record from
  Vercel to avoid stale certificates.

Keeping these steps consistent ensures tenants always land on a secure, branded experience while our
team has a clear audit trail for every DNS or certificate change.
