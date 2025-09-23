# Security Policy

## HTTP Security Headers

The application sends the following security headers via `next.config.js`:

- `Content-Security-Policy`: Locks down default, script, style, media, image, font, frame, object, base, and form sources to the trusted services required by the portal.
- `Referrer-Policy: strict-origin-when-cross-origin`: Reduces referrer leakage to third-party origins while preserving same-origin analytics.
- `X-Frame-Options: DENY`: Blocks clickjacking by preventing the app from being embedded in external frames.
- `X-Content-Type-Options: nosniff`: Stops MIME-type sniffing for script and style responses.
- `X-DNS-Prefetch-Control: on`: Allows DNS prefetching for a balanced performance and privacy posture.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`: Enforces HTTPS across the primary domain and subdomains for one year.
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`: Enables opener isolation while keeping payment and document workflows that rely on popups functional.
- `Cross-Origin-Embedder-Policy: unsafe-none`: Maintains compatibility with third-party embeds (e.g., Supabase Storage documents, YouTube media) that do not yet emit `Cross-Origin-Resource-Policy` headers.
- `X-XSS-Protection: 1; mode=block`: Requests blocking behaviour from legacy XSS filters.
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`: Explicitly denies access to sensitive browser features not used by the app.

## Reporting a Vulnerability

Please head to Advisories to submit a private vulnerability report.
If needed, check out the docs explaining [how to submit a private vulnerability report](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository#enabling-or-disabling-private-vulnerability-reporting-for-a-repository).
